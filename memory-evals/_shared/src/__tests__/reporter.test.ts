import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildSummary, Reporter } from '../reporter.js';
import type { QuestionResult } from '../types.js';

const r = (over: Partial<QuestionResult>): QuestionResult => ({
  question_id: over.question_id ?? 'q',
  question: 'q',
  gold_answer: 'g',
  predicted_answer: 'p',
  score: over.score ?? 1,
  sessions_fed: 1,
  conversation_ids: ['c'],
  duration_ms: 1,
  ...over,
});

describe('buildSummary', () => {
  it('computes accuracy with partial credit', () => {
    const s = buildSummary(
      [r({ score: 1 }), r({ score: 0.5 }), r({ score: 0 })],
      { benchmark: 'LongMemEval', extractionMethod: 'x', feedMode: 'y' }
    );
    expect(s.correct).toBe(1);
    expect(s.partial).toBe(1);
    expect(s.accuracy).toBe(50);
    expect(s.total_questions).toBe(3);
  });

  it('groups by question_type for LME', () => {
    const s = buildSummary(
      [
        r({ question_id: 'a', question_type: 'multi-session', score: 1 }),
        r({ question_id: 'b', question_type: 'multi-session', score: 0 }),
        r({ question_id: 'c', question_type: 'single-session-user', score: 1 }),
      ],
      { benchmark: 'LongMemEval', extractionMethod: 'x', feedMode: 'y' }
    );
    expect(s.category_scores['multi-session']).toEqual({ correct: 1, partial: 0, total: 2 });
    expect(s.category_scores['single-session-user']).toEqual({ correct: 1, partial: 0, total: 1 });
  });

  it('groups by `cat_<n>` for LoCoMo', () => {
    const s = buildSummary(
      [
        r({ question_id: 'a', category: 1, score: 1 }),
        r({ question_id: 'b', category: 5, score: 0 }),
      ],
      { benchmark: 'LoCoMo', extractionMethod: 'x', feedMode: 'y' }
    );
    expect(s.category_scores['cat_1']?.correct).toBe(1);
    expect(s.category_scores['cat_5']?.total).toBe(1);
  });

  it('skips null-score entries from accuracy denominator', () => {
    const s = buildSummary(
      [r({ score: 1 }), r({ score: null })],
      { benchmark: 'LongMemEval', extractionMethod: 'x', feedMode: 'y' }
    );
    expect(s.correct).toBe(1);
    expect(s.accuracy).toBe(100);
    expect(s.total_questions).toBe(2);
  });
});

describe('Reporter', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mem-eval-reporter-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes results.json and summary.md', async () => {
    const reporter = new Reporter({
      dir,
      benchmark: 'LongMemEval',
      extractionMethod: 'foo',
      feedMode: 'bar',
    });
    const { paths } = await reporter.write([r({ score: 1 })]);
    expect(paths).toHaveLength(2);
    const json = JSON.parse(await readFile(join(dir, 'results.json'), 'utf8'));
    expect(json.benchmark).toBe('LongMemEval');
    expect(json.results).toHaveLength(1);
    const md = await readFile(join(dir, 'summary.md'), 'utf8');
    expect(md).toContain('# LongMemEval');
  });

  it('writeRaw drops a per-question file', async () => {
    const reporter = new Reporter({
      dir,
      benchmark: 'LoCoMo',
      extractionMethod: 'x',
      feedMode: 'y',
    });
    const path = await reporter.writeRaw('sample/with weird*chars', { ok: true });
    expect(path).toMatch(/raw\/sample_with_weird_chars\.json$/);
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ ok: true });
  });
});
