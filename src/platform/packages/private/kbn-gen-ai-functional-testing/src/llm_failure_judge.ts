/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import type { Readable } from 'stream';

import type { Client } from '@elastic/elasticsearch';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * LLM-as-judge triage for failing gen-ai smoke tests: classifies a failure as a
 * provider/service problem (flaky third-party API) or a problem in our own code path.
 * The judge invokes ES inference endpoints directly (`_inference/chat_completion`),
 * bypassing the Kibana inference plugin, so a Kibana regression cannot corrupt the verdict.
 */

export type LlmSmokeFailureVerdict = 'provider' | 'code' | 'unknown';

export interface LlmSmokeFailureEvidence {
  /** Connector or EIS model under test. */
  target: string;
  /** What the test was doing when it failed. */
  scenario: string;
  statusCode?: number;
  responseBody?: string;
  errorMessage: string;
}

export interface LlmSmokeFailureJudgement {
  verdict: LlmSmokeFailureVerdict;
  reason: string;
  /** Inference endpoint that produced the verdict; unset when no judge was reachable. */
  judgeInferenceId?: string;
}

export const LLM_SMOKE_JUDGEMENTS_PATH = resolve(REPO_ROOT, 'target/llm_smoke_judgements.jsonl');

/** Max number of backup inference endpoints to try before giving up on a verdict. */
export const MAX_LLM_SMOKE_JUDGES = 3;

const JUDGE_REQUEST_TIMEOUT_MS = 60_000;
const MAX_EVIDENCE_CHARS = 4_000;

const truncate = (value: string): string =>
  value.length > MAX_EVIDENCE_CHARS ? `${value.slice(0, MAX_EVIDENCE_CHARS)}…[truncated]` : value;

const buildJudgePrompt = (evidence: LlmSmokeFailureEvidence): string => {
  return [
    `You are triaging a failed automated smoke test from Kibana CI. The test sent a chat request through Kibana to an LLM connector and failed.`,
    ``,
    `Classify the root cause of the failure:`,
    `- "provider": the LLM provider or inference service failed — rate limiting (429), quota exhaustion, provider-side timeouts, provider-side 5xx or overload, model temporarily unavailable, or credential/authorization failures on the provider side.`,
    `- "code": the Kibana or Elasticsearch code path is broken — request validation errors, schema or serialization errors, unexpected exceptions, malformed requests sent to the provider, or a well-formed provider response that our code mishandled.`,
    `- "unknown": the evidence is insufficient or ambiguous.`,
    ``,
    `Evidence:`,
    `<target>${evidence.target}</target>`,
    `<scenario>${evidence.scenario}</scenario>`,
    `<http-status>${evidence.statusCode ?? 'n/a'}</http-status>`,
    `<error-message>${truncate(evidence.errorMessage)}</error-message>`,
    `<response-body>${truncate(evidence.responseBody ?? 'n/a')}</response-body>`,
    ``,
    `Answer with exactly one JSON object and nothing else:`,
    `{"verdict": "provider" | "code" | "unknown", "reason": "<one short sentence>"}`,
  ].join('\n');
};

/**
 * Extracts the assistant message text from a raw `_inference/chat_completion` `_stream`
 * SSE payload (OpenAI-style chunks with `choices[0].delta.content`).
 */
export const parseChatCompletionSse = (raw: string): string => {
  let content = '';
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      continue;
    }
    const payload = trimmed.slice('data:'.length).trim();
    if (payload === '[DONE]') {
      break;
    }
    try {
      const chunk = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string | null } }>;
      };
      content += chunk.choices?.[0]?.delta?.content ?? '';
    } catch {
      // ignore malformed chunks
    }
  }
  return content;
};

/** Parses the judge reply, tolerating prose around the JSON object. */
export const parseJudgeVerdict = (
  text: string
): Pick<LlmSmokeFailureJudgement, 'verdict' | 'reason'> | undefined => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      verdict?: unknown;
      reason?: unknown;
    };
    if (
      parsed.verdict === 'provider' ||
      parsed.verdict === 'code' ||
      parsed.verdict === 'unknown'
    ) {
      return {
        verdict: parsed.verdict,
        reason: typeof parsed.reason === 'string' ? parsed.reason : 'no reason given',
      };
    }
  } catch {
    // fall through
  }
  return undefined;
};

/**
 * Lists EIS chat-completion inference endpoints on the cluster, usable as judge
 * endpoints when no pre-discovered model list (`target/eis_models.json`) is available.
 * Requires CCM to be enabled; returns an empty list when EIS is not reachable.
 */
export const discoverEisJudgeInferenceIds = async (esClient: Client): Promise<string[]> => {
  try {
    const response = await esClient.inference.get({ inference_id: '_all' });
    return response.endpoints
      .filter((ep) => ep.task_type === 'chat_completion' && ep.service === 'elastic')
      .map((ep) => ep.inference_id);
  } catch {
    return [];
  }
};

const readStreamToString = async (stream: Readable): Promise<string> => {
  let raw = '';
  for await (const chunk of stream) {
    raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
  }
  return raw;
};

/**
 * Asks the given inference endpoints, in order, to classify a smoke-test failure.
 * Each endpoint acts as a backup evaluator for the previous one; when none is
 * reachable the verdict is `unknown` so the original failure is preserved.
 */
export const judgeLlmSmokeFailure = async ({
  esClient,
  evidence,
  judgeInferenceIds,
}: {
  esClient: Client;
  evidence: LlmSmokeFailureEvidence;
  judgeInferenceIds: string[];
}): Promise<LlmSmokeFailureJudgement> => {
  const prompt = buildJudgePrompt(evidence);

  for (const inferenceId of judgeInferenceIds.slice(0, MAX_LLM_SMOKE_JUDGES)) {
    try {
      const stream = (await esClient.transport.request(
        {
          method: 'POST',
          path: `/_inference/chat_completion/${encodeURIComponent(inferenceId)}/_stream`,
          body: {
            messages: [{ role: 'user', content: prompt }],
          },
        },
        {
          asStream: true,
          requestTimeout: JUDGE_REQUEST_TIMEOUT_MS,
          headers: {
            // always send a value for EIS
            'X-Elastic-Product-Use-Case': 'kibana-ci-llm-smoke-judge',
          },
        }
      )) as unknown as Readable;

      const verdict = parseJudgeVerdict(parseChatCompletionSse(await readStreamToString(stream)));
      if (verdict) {
        return { ...verdict, judgeInferenceId: inferenceId };
      }
    } catch {
      // judge endpoint unavailable — try the next backup evaluator
    }
  }

  return {
    verdict: 'unknown',
    reason:
      judgeInferenceIds.length === 0
        ? 'no judge inference endpoints available'
        : 'no judge inference endpoint returned a usable verdict',
  };
};

/**
 * Appends a judgement record to `target/llm_smoke_judgements.jsonl` so CI can
 * upload it as an artifact and surface judged failures in a build annotation.
 */
export const recordLlmSmokeJudgement = (
  evidence: LlmSmokeFailureEvidence,
  judgement: LlmSmokeFailureJudgement
): void => {
  const record = {
    timestamp: new Date().toISOString(),
    target: evidence.target,
    scenario: evidence.scenario,
    statusCode: evidence.statusCode,
    errorMessage: truncate(evidence.errorMessage),
    ...judgement,
  };
  try {
    mkdirSync(dirname(LLM_SMOKE_JUDGEMENTS_PATH), { recursive: true });
    appendFileSync(LLM_SMOKE_JUDGEMENTS_PATH, `${JSON.stringify(record)}\n`);
  } catch {
    // recording is best-effort; never mask the original failure
  }
};
