/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';

import type { Client } from '@elastic/elasticsearch';

import {
  judgeLlmSmokeFailure,
  parseChatCompletionSse,
  parseJudgeVerdict,
  type LlmSmokeFailureEvidence,
} from './llm_failure_judge';

const sseChunk = (content: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

const evidence: LlmSmokeFailureEvidence = {
  target: 'eis-gemini-2.5-pro',
  scenario: 'simple message',
  statusCode: 500,
  responseBody: '{"message":"upstream timeout"}',
  errorMessage: 'expected 200, got 500',
};

describe('parseChatCompletionSse', () => {
  it('concatenates delta content across chunks and stops at [DONE]', () => {
    const raw =
      sseChunk('{"verdict":') +
      sseChunk(' "provider",') +
      sseChunk(' "reason": "rate limited"}') +
      'data: [DONE]\n\n' +
      sseChunk('ignored');
    expect(parseChatCompletionSse(raw)).toBe('{"verdict": "provider", "reason": "rate limited"}');
  });

  it('ignores malformed chunks and non-data lines', () => {
    const raw = `event: message\ndata: not-json\n${sseChunk('ok')}`;
    expect(parseChatCompletionSse(raw)).toBe('ok');
  });
});

describe('parseJudgeVerdict', () => {
  it('parses a bare JSON verdict', () => {
    expect(parseJudgeVerdict('{"verdict":"provider","reason":"429 from provider"}')).toEqual({
      verdict: 'provider',
      reason: '429 from provider',
    });
  });

  it('parses a verdict embedded in prose', () => {
    expect(
      parseJudgeVerdict('Sure! Here is my answer:\n{"verdict":"code","reason":"schema error"}\n')
    ).toEqual({ verdict: 'code', reason: 'schema error' });
  });

  it('returns undefined for invalid verdict values', () => {
    expect(parseJudgeVerdict('{"verdict":"maybe","reason":"?"}')).toBeUndefined();
  });

  it('returns undefined when no JSON object is present', () => {
    expect(parseJudgeVerdict('the provider seems down')).toBeUndefined();
  });

  it('defaults the reason when missing', () => {
    expect(parseJudgeVerdict('{"verdict":"unknown"}')).toEqual({
      verdict: 'unknown',
      reason: 'no reason given',
    });
  });
});

describe('judgeLlmSmokeFailure', () => {
  const clientWith = (request: jest.Mock): Client =>
    ({ transport: { request } } as unknown as Client);

  it('returns the verdict from the first reachable judge', async () => {
    const request = jest
      .fn()
      .mockResolvedValue(
        Readable.from([sseChunk('{"verdict":"provider","reason":"quota exceeded"}')])
      );

    const judgement = await judgeLlmSmokeFailure({
      esClient: clientWith(request),
      evidence,
      judgeInferenceIds: ['.judge-a', '.judge-b'],
    });

    expect(judgement).toEqual({
      verdict: 'provider',
      reason: 'quota exceeded',
      judgeInferenceId: '.judge-a',
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      path: '/_inference/chat_completion/.judge-a/_stream',
    });
  });

  it('falls back to the next judge when the first fails', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(new Error('endpoint unavailable'))
      .mockResolvedValueOnce(
        Readable.from([sseChunk('{"verdict":"code","reason":"bad payload"}')])
      );

    const judgement = await judgeLlmSmokeFailure({
      esClient: clientWith(request),
      evidence,
      judgeInferenceIds: ['.judge-a', '.judge-b'],
    });

    expect(judgement).toEqual({
      verdict: 'code',
      reason: 'bad payload',
      judgeInferenceId: '.judge-b',
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('falls back when a judge returns an unparsable reply', async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce(Readable.from([sseChunk('no json here')]))
      .mockResolvedValueOnce(
        Readable.from([sseChunk('{"verdict":"provider","reason":"overloaded"}')])
      );

    const judgement = await judgeLlmSmokeFailure({
      esClient: clientWith(request),
      evidence,
      judgeInferenceIds: ['.judge-a', '.judge-b'],
    });

    expect(judgement.verdict).toBe('provider');
    expect(judgement.judgeInferenceId).toBe('.judge-b');
  });

  it('returns unknown when every judge fails', async () => {
    const request = jest.fn().mockRejectedValue(new Error('down'));

    const judgement = await judgeLlmSmokeFailure({
      esClient: clientWith(request),
      evidence,
      judgeInferenceIds: ['.judge-a', '.judge-b'],
    });

    expect(judgement).toEqual({
      verdict: 'unknown',
      reason: 'no judge inference endpoint returned a usable verdict',
    });
  });

  it('returns unknown without calling ES when no judges are configured', async () => {
    const request = jest.fn();

    const judgement = await judgeLlmSmokeFailure({
      esClient: clientWith(request),
      evidence,
      judgeInferenceIds: [],
    });

    expect(judgement).toEqual({
      verdict: 'unknown',
      reason: 'no judge inference endpoints available',
    });
    expect(request).not.toHaveBeenCalled();
  });
});
