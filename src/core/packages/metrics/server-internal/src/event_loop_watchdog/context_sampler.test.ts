/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContextSampler, SAMPLE_EXPRESSION } from './context_sampler';
import type { InspectorSession } from './profile_capture';
import {
  CONTEXT_SAMPLE_AFTER_MS,
  CONTEXT_SAMPLE_INTERVAL_MS,
  MAX_CONTEXT_FIELD_LENGTH,
  MAX_CONTEXT_SAMPLES,
  MAX_REPORTED_CONTEXTS,
} from './constants';

const BLOCK = 10_000;
const task = { type: 'task manager', name: 'run alerting:example', id: 'task-1' };
const otherTask = { type: 'task manager', name: 'run actions:example', id: 'task-2' };

/** What `Runtime.evaluate` answers for a value returned by the reader. */
const answerFor = (value: unknown) => {
  if (value === undefined) {
    return { result: { type: 'undefined' } };
  }
  return value === null
    ? { result: { type: 'object', subtype: 'null', value: null } }
    : { result: { type: 'object', value } };
};

describe('ContextSampler', () => {
  let sessions: Array<jest.Mocked<InspectorSession>>;
  /** What the main thread's reader returns for the next samples. */
  let running: unknown;
  let blocked: boolean;
  let failConnect: boolean;
  let onFailure: jest.Mock;
  let sampler: ContextSampler;

  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };
  /** Polls the block every 25ms up to `untilMs` into it, answering each sample as it's requested. */
  const sampleUntil = async (untilMs: number, fromMs = 0, startedAt = BLOCK) => {
    for (let elapsed = fromMs; elapsed <= untilMs; elapsed += 25) {
      sampler.sample(startedAt, startedAt + elapsed);
      await settle();
    }
  };

  beforeEach(() => {
    sessions = [];
    running = task;
    blocked = true;
    failConnect = false;
    onFailure = jest.fn();
    sampler = new ContextSampler({
      createSession: () => {
        const session: jest.Mocked<InspectorSession> = {
          connectToMainThread: jest.fn(() => {
            if (failConnect) {
              throw new Error('inspector not available');
            }
          }),
          disconnect: jest.fn(),
          post: jest.fn(
            async (method: string): Promise<unknown> => answerFor(running)
          ) as jest.Mocked<InspectorSession>['post'],
        };
        sessions.push(session);
        return session;
      },
      isBlocked: () => blocked,
      onFailure,
    });
  });

  it('calls the reader the main thread installs under a global symbol', () => {
    expect(SAMPLE_EXPRESSION).toBe(
      'globalThis[Symbol.for("kbn.core.eventLoopWatchdog.readExecutionContext")]?.()'
    );
  });

  it("doesn't open a session for a block shorter than the first sample", async () => {
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS - 25);
    expect(sessions).toHaveLength(0);
    expect(sampler.end(BLOCK)).toBeUndefined();
    expect(sampler.stats).toEqual({ sampledBlocks: 0, samples: 0, failed: 0 });
  });

  it('samples the block through one session, after the delay and then every interval', async () => {
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS + 2 * CONTEXT_SAMPLE_INTERVAL_MS);
    expect(sessions).toHaveLength(1);
    const [session] = sessions;
    expect(session.connectToMainThread).toHaveBeenCalledTimes(1);
    expect(session.post.mock.calls).toEqual(
      new Array(3).fill([
        'Runtime.evaluate',
        { expression: SAMPLE_EXPRESSION, returnByValue: true, silent: true },
      ])
    );
    expect(sampler.contexts(BLOCK)).toEqual({
      samples: 3,
      withoutContext: 0,
      top: [{ context: task, samples: 3 }],
    });
  });

  it('counts each execution context it finds, most samples first, and the samples without one', async () => {
    running = otherTask;
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS);
    running = null;
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS + 500, CONTEXT_SAMPLE_AFTER_MS + 25);
    running = task;
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS + 1_500, CONTEXT_SAMPLE_AFTER_MS + 525);
    expect(sampler.end(BLOCK)).toEqual({
      samples: 4,
      withoutContext: 1,
      top: [
        { context: task, samples: 2 },
        { context: otherTask, samples: 1 },
      ],
    });
    expect(sampler.stats).toEqual({ sampledBlocks: 1, samples: 4, failed: 0 });
  });

  it('ends the session with the block, and opens a new one for the next block', async () => {
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS);
    expect(sessions[0].disconnect).not.toHaveBeenCalled();
    sampler.end(BLOCK);
    expect(sessions[0].disconnect).toHaveBeenCalledTimes(1);
    expect(sampler.contexts(BLOCK)).toBeUndefined();

    running = otherTask;
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS, 0, BLOCK + 60_000);
    expect(sessions).toHaveLength(2);
    expect(sampler.end(BLOCK + 60_000)).toEqual({
      samples: 1,
      withoutContext: 0,
      top: [{ context: otherTask, samples: 1 }],
    });
  });

  it('waits for an answer before it requests the next sample', async () => {
    let reply = () => {};
    sampler.sample(BLOCK, BLOCK + CONTEXT_SAMPLE_AFTER_MS);
    sessions[0].post.mockImplementation(
      () => new Promise((resolve) => (reply = () => resolve(answerFor(task))))
    );
    await settle();
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS + 5_000, CONTEXT_SAMPLE_AFTER_MS + 500);
    // The first sample was answered; the second is waiting, as when the main thread is in native code.
    expect(sessions[0].post).toHaveBeenCalledTimes(2);
    reply();
    await settle();
    expect(sampler.contexts(BLOCK)?.samples).toBe(2);
  });

  it('drops an answer that arrives once the main thread has resumed', async () => {
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS);
    // The block ended before this sample ran: it ran from the event loop, outside any context.
    running = null;
    blocked = false;
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS + 500, CONTEXT_SAMPLE_AFTER_MS + 25);
    expect(sessions[0].post).toHaveBeenCalledTimes(2);
    expect(sampler.end(BLOCK)).toEqual({
      samples: 1,
      withoutContext: 0,
      top: [{ context: task, samples: 1 }],
    });
  });

  it('ignores the answer to a sample of a block that has ended', async () => {
    let reply = () => {};
    sampler.sample(BLOCK, BLOCK + CONTEXT_SAMPLE_AFTER_MS);
    sessions[0].post.mockImplementation(
      () => new Promise((resolve) => (reply = () => resolve(answerFor(task))))
    );
    await settle();
    sampler.sample(BLOCK, BLOCK + CONTEXT_SAMPLE_AFTER_MS + 500);
    expect(sampler.end(BLOCK)?.samples).toBe(1);
    sampler.sample(BLOCK + 60_000, BLOCK + 60_000);
    reply();
    await settle();
    expect(sampler.end(BLOCK + 60_000)).toBeUndefined();
    expect(sampler.stats.samples).toBe(1);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("doesn't count the rejected sample of a session it closed", async () => {
    sampler.sample(BLOCK, BLOCK + CONTEXT_SAMPLE_AFTER_MS);
    let reject: (error: Error) => void = () => {};
    sessions[0].post.mockImplementation(() => new Promise((_, fail) => (reject = fail)));
    await settle();
    sampler.sample(BLOCK, BLOCK + CONTEXT_SAMPLE_AFTER_MS + 500);
    sampler.end(BLOCK);
    reject(new Error('Session closed'));
    await settle();
    expect(onFailure).not.toHaveBeenCalled();
    expect(sampler.stats.failed).toBe(0);
  });

  it(`stops after ${MAX_CONTEXT_SAMPLES} samples of a block`, async () => {
    await sampleUntil(
      CONTEXT_SAMPLE_AFTER_MS + (MAX_CONTEXT_SAMPLES + 10) * CONTEXT_SAMPLE_INTERVAL_MS
    );
    expect(sessions[0].post).toHaveBeenCalledTimes(MAX_CONTEXT_SAMPLES);
    expect(sampler.end(BLOCK)?.samples).toBe(MAX_CONTEXT_SAMPLES);
  });

  it(`keeps the ${MAX_REPORTED_CONTEXTS} most sampled contexts`, async () => {
    let at = BLOCK + CONTEXT_SAMPLE_AFTER_MS;
    for (let index = 0; index < MAX_REPORTED_CONTEXTS + 2; index++) {
      running = { ...task, id: `task-${index}` };
      // Each context gets one more sample than the one before it.
      for (let samples = 0; samples <= index; samples++) {
        sampler.sample(BLOCK, at);
        await settle();
        at += CONTEXT_SAMPLE_INTERVAL_MS;
      }
    }
    const contexts = sampler.end(BLOCK);
    expect(contexts?.top).toHaveLength(MAX_REPORTED_CONTEXTS);
    expect(contexts?.top[0].context.id).toBe(`task-${MAX_REPORTED_CONTEXTS + 1}`);
    expect(contexts?.top.map(({ context }) => context.id)).not.toContain('task-0');
  });

  it('keeps only capped, single-line type, name and id strings from an answer', async () => {
    running = {
      type: 42,
      name: 'line\n1\u0000'.padEnd(MAX_CONTEXT_FIELD_LENGTH + 10, 'x'),
      id: 'id',
      meta: { ignored: true },
      child: { type: 'alert', name: 'execute example', id: 'rule-1' },
    };
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS);
    expect(sampler.end(BLOCK)?.top).toEqual([
      { context: { name: 'line 1 '.padEnd(MAX_CONTEXT_FIELD_LENGTH, 'x'), id: 'id' }, samples: 1 },
    ]);
  });

  it('counts samples of the same outer context together, whatever is nested in it', async () => {
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS);
    running = { ...task, child: { type: 'alert', name: 'execute example', id: 'rule-1' } };
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS + 500, CONTEXT_SAMPLE_AFTER_MS + 25);
    expect(sampler.end(BLOCK)).toEqual({
      samples: 2,
      withoutContext: 0,
      top: [{ context: task, samples: 2 }],
    });
  });

  it('reports a session that fails to connect, and stops sampling that block', async () => {
    failConnect = true;
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS + 2_000);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].disconnect).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith(new Error('inspector not available'));
    expect(sampler.end(BLOCK)).toBeUndefined();
    expect(sampler.stats).toEqual({ sampledBlocks: 0, samples: 0, failed: 1 });

    // The next block is tried again.
    failConnect = false;
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS, 0, BLOCK + 60_000);
    expect(sampler.end(BLOCK + 60_000)?.samples).toBe(1);
  });

  it.each([
    [
      'the command is rejected',
      () => Promise.reject(new Error('inspector unavailable')),
      'inspector unavailable',
    ],
    [
      'the reader throws',
      () => Promise.resolve({ result: { type: 'object' }, exceptionDetails: { text: 'Uncaught' } }),
      'Uncaught',
    ],
    [
      'the reader is not installed',
      () => Promise.resolve(answerFor(undefined)),
      'the execution context reader is not installed',
    ],
  ])(
    'keeps the samples so far and stops sampling the block when %s',
    async (_, answer, message) => {
      await sampleUntil(CONTEXT_SAMPLE_AFTER_MS);
      sessions[0].post.mockImplementation(answer);
      await sampleUntil(CONTEXT_SAMPLE_AFTER_MS + 3_000, CONTEXT_SAMPLE_AFTER_MS + 25);
      expect(sessions[0].post).toHaveBeenCalledTimes(2);
      expect(sessions[0].disconnect).toHaveBeenCalledTimes(1);
      expect(onFailure).toHaveBeenCalledTimes(1);
      expect(onFailure.mock.calls[0][0]).toMatchObject({ message });
      expect(sampler.end(BLOCK)).toEqual({
        samples: 1,
        withoutContext: 0,
        top: [{ context: task, samples: 1 }],
      });
      expect(sampler.stats).toEqual({ sampledBlocks: 1, samples: 1, failed: 1 });
    }
  );

  it('resets its counts', async () => {
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS);
    sampler.end(BLOCK);
    sampler.resetStats();
    expect(sampler.stats).toEqual({ sampledBlocks: 0, samples: 0, failed: 0 });
  });

  it('closes the session of the block being sampled when released', async () => {
    await sampleUntil(CONTEXT_SAMPLE_AFTER_MS);
    sampler.release();
    expect(sessions[0].disconnect).toHaveBeenCalledTimes(1);
    expect(() => sampler.release()).not.toThrow();
  });
});
