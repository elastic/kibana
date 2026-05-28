import { createHash } from 'node:crypto';

import {
  type ImportRound,
  type KibanaClient,
  type LoCoMoSample,
  log,
  locomoSessions,
  locomoSessionToRounds,
} from '@memory-evals/shared';

const EMPTY_USER_PLACEHOLDER = '(prior context)';
const EMPTY_ASSISTANT_PLACEHOLDER = '(no reply recorded)';

const padRounds = (rounds: ImportRound[]): ImportRound[] =>
  rounds.map((r) => ({
    ...r,
    user_message: r.user_message.trim().length === 0 ? EMPTY_USER_PLACEHOLDER : r.user_message,
    assistant_message:
      r.assistant_message.trim().length === 0 ? EMPTY_ASSISTANT_PLACEHOLDER : r.assistant_message,
  }));

const deterministicId = (runId: string, sampleId: string, sessionIdx: number): string => {
  const h = createHash('sha256')
    .update(`${runId}\x00${sampleId}\x00session_${sessionIdx}`)
    .digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

export interface SampleAgentResolver {
  (sampleId: string): string;
}

export const sampleAgentId = (runId: string, sampleId: string): string =>
  `eval-locomo-${runId}-${sampleId}`.replace(/[^A-Za-z0-9._-]/g, '_');

export interface IngestOptions {
  client: KibanaClient;
  runId: string;
  /** Agent id to use for the whole sample. Resolved from `sampleAgentId` by default. */
  agentId: string;
  /** Skip memory extract calls. */
  skipMemoryExtract?: boolean;
  /** Limit how many sessions per sample are imported (debug). */
  maxSessions?: number;
}

export interface IngestedSession {
  conversation_id: string;
  session_idx: number;
  rounds: number;
  started_at?: string;
}

export const ingestSample = async (
  sample: LoCoMoSample,
  opts: IngestOptions
): Promise<IngestedSession[]> => {
  const { client, agentId, runId } = opts;
  const sessions = locomoSessions(sample);
  const slice = opts.maxSessions ? sessions.slice(0, opts.maxSessions) : sessions;
  const out: IngestedSession[] = [];

  for (const session of slice) {
    const rounds = padRounds(locomoSessionToRounds(session, sample));
    if (rounds.length === 0) continue;
    const conversationId = deterministicId(runId, sample.sample_id, session.index);
    const title = `eval:${runId}:${sample.sample_id}:session_${session.index}`;

    try {
      await client.importConversation({
        agent_id: agentId,
        id: conversationId,
        title,
        mode: 'overwrite',
        rounds,
      });
    } catch (e) {
      throw new Error(
        `LoCoMo ingest failed (sample=${sample.sample_id}, session=${session.index}): ${(e as Error).message}`
      );
    }

    if (!opts.skipMemoryExtract) {
      const memoryOpts: { conversation_id: string; agent_id: string; started_at?: string } = {
        conversation_id: conversationId,
        agent_id: agentId,
      };
      if (session.dateIso !== undefined) memoryOpts.started_at = session.dateIso;
      try {
        await client.triggerMemoryExtract(memoryOpts);
      } catch (e) {
        throw new Error(
          `LoCoMo memory extract failed (sample=${sample.sample_id}, session=${session.index}): ${(e as Error).message}`
        );
      }
    }

    const ingested: IngestedSession = {
      conversation_id: conversationId,
      session_idx: session.index,
      rounds: rounds.length,
    };
    if (session.dateIso !== undefined) ingested.started_at = session.dateIso;
    out.push(ingested);
  }
  log(`  ingested ${out.length} session(s) for sample ${sample.sample_id}`);
  return out;
};
