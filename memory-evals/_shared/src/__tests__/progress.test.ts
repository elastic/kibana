import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProgressTracker } from '../progress.js';
import type { QuestionResult } from '../types.js';

describe('ProgressTracker', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mem-eval-progress-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const sample: QuestionResult = {
    question_id: 'q1',
    question: 'q',
    gold_answer: 'g',
    predicted_answer: 'p',
    score: 1,
    sessions_fed: 3,
    conversation_ids: ['c1', 'c2'],
    duration_ms: 5,
  };

  it('records results to state.json atomically', async () => {
    const t = new ProgressTracker({ dir, runId: 'r1', benchmark: 'LongMemEval' });
    await t.load();
    await t.record(sample);
    const raw = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
    expect(raw.completed.q1.score).toBe(1);
    expect(raw.run_id).toBe('r1');
  });

  it('resumes from disk', async () => {
    const t1 = new ProgressTracker({ dir, runId: 'r1', benchmark: 'LongMemEval' });
    await t1.load();
    await t1.record(sample);
    const t2 = new ProgressTracker({ dir, runId: 'r1', benchmark: 'LongMemEval' });
    await t2.load();
    expect(t2.isCompleted('q1')).toBe(true);
    expect(t2.get('q1')?.score).toBe(1);
  });

  it('fails on benchmark mismatch', async () => {
    const t1 = new ProgressTracker({ dir, runId: 'r1', benchmark: 'LongMemEval' });
    await t1.load();
    await t1.record(sample);
    const t2 = new ProgressTracker({ dir, runId: 'r1', benchmark: 'LoCoMo' });
    await expect(t2.load()).rejects.toThrow(/benchmark mismatch/);
  });

  it('clears in_flight when recording', async () => {
    const t = new ProgressTracker({ dir, runId: 'r1', benchmark: 'LongMemEval' });
    await t.load();
    await t.markInFlight('q1', ['c1'], 'default');
    expect(t.takeInFlight()).toBeDefined();
    await t.record(sample);
    expect(t.takeInFlight()).toBeUndefined();
  });

  it('records per-sample bookkeeping for LoCoMo', async () => {
    const t = new ProgressTracker({ dir, runId: 'r1', benchmark: 'LoCoMo' });
    await t.load();
    await t.recordSample('s1', { conversation_ids: ['c1'], sessions_fed: 1, agent_id: 'a' });
    expect(t.getSample('s1')?.conversation_ids).toEqual(['c1']);
  });
});
