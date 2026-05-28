import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  chunkRoundsIntoSessions,
  loadMemoryAgentBench,
  mabDocumentsToRounds,
  mabGoldAnswer,
  mabTurnsToRounds,
  normalizeMabTask,
} from '../dataset.js';

describe('normalizeMabTask', () => {
  it.each([
    ['AR', 'AR'],
    ['ar', 'AR'],
    ['Accurate Retrieval', 'AR'],
    ['accurate_retrieval', 'AR'],
    ['TTL', 'TTL'],
    ['Test-Time Learning', 'TTL'],
    ['test_time_learning', 'TTL'],
    ['LRU', 'LRU'],
    ['long_range_understanding', 'LRU'],
    ['CR', 'CR'],
    ['conflict resolution', 'CR'],
  ])('normalizes %s → %s', (raw, want) => {
    expect(normalizeMabTask(raw)).toBe(want);
  });

  it('returns undefined for unknown task', () => {
    expect(normalizeMabTask('mystery')).toBeUndefined();
    expect(normalizeMabTask(undefined)).toBeUndefined();
  });
});

describe('mabTurnsToRounds + chunkRoundsIntoSessions', () => {
  it('pairs alternating turns and chunks them', () => {
    const rounds = mabTurnsToRounds([
      { role: 'user', content: 'u1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'u2' },
      { role: 'assistant', content: 'a2' },
      { role: 'user', content: 'u3' },
      { role: 'assistant', content: 'a3' },
    ]);
    expect(rounds).toHaveLength(3);
    const sessions = chunkRoundsIntoSessions(rounds, 2);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toHaveLength(2);
    expect(sessions[1]).toHaveLength(1);
  });

  it('chunkRoundsIntoSessions with size <= 0 keeps a single session', () => {
    const rounds = mabTurnsToRounds([
      { role: 'user', content: 'u1' },
      { role: 'assistant', content: 'a1' },
    ]);
    expect(chunkRoundsIntoSessions(rounds, 0)).toEqual([rounds]);
  });
});

describe('mabDocumentsToRounds', () => {
  it('produces one synthetic round per document', () => {
    const rounds = mabDocumentsToRounds(['doc1', 'doc2']);
    expect(rounds).toHaveLength(2);
    expect(rounds[0]?.user_message).toBeTruthy();
    expect(rounds[0]?.assistant_message).toBe('doc1');
  });
});

describe('mabGoldAnswer', () => {
  it('stringifies numbers', () => {
    expect(mabGoldAnswer({ question: 'q', answer: 42 })).toBe('42');
  });
  it('joins arrays', () => {
    expect(mabGoldAnswer({ question: 'q', answer: ['a', 'b'] })).toBe('a, b');
  });
  it('returns empty string for null', () => {
    expect(mabGoldAnswer({ question: 'q', answer: null })).toBe('');
  });
});

describe('loadMemoryAgentBench', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mab-load-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const writeSample = async (data: unknown): Promise<string> => {
    const p = join(dir, 'mab.json');
    await writeFile(p, JSON.stringify(data), 'utf8');
    return p;
  };

  it('accepts a plain array', async () => {
    const p = await writeSample([
      {
        sample_id: 's1',
        task: 'AR',
        context_turns: [{ role: 'user', content: 'u' }, { role: 'assistant', content: 'a' }],
        qa: [{ question: 'q', answer: 'a' }],
      },
    ]);
    const samples = await loadMemoryAgentBench(p);
    expect(samples).toHaveLength(1);
    expect(samples[0]?.task).toBe('AR');
  });

  it('accepts {samples:[...]} wrapper', async () => {
    const p = await writeSample({
      samples: [
        {
          sample_id: 's2',
          task_type: 'long_range_understanding',
          context: 'A long doc.',
          qa: [{ question: 'q', answer: 'ans' }],
        },
      ],
    });
    const samples = await loadMemoryAgentBench(p);
    expect(samples[0]?.task).toBe('LRU');
    expect(samples[0]?.context_documents).toEqual(['A long doc.']);
  });

  it('accepts task-keyed root object', async () => {
    const p = await writeSample({
      AR: [
        {
          id: 'a1',
          context_turns: [{ role: 'user', content: 'u' }, { role: 'assistant', content: 'a' }],
          qa: [{ question: 'q', answer: 'a' }],
        },
      ],
      CR: [
        {
          id: 'c1',
          context: 'one doc',
          qa: [{ question: 'q', answer: 'a' }],
        },
      ],
    });
    const samples = await loadMemoryAgentBench(p);
    expect(samples.map((s) => s.task).sort()).toEqual(['AR', 'CR']);
  });

  it('rejects sample with missing task', async () => {
    const p = await writeSample([
      { sample_id: 's1', context: 'doc', qa: [{ question: 'q', answer: 'a' }] },
    ]);
    await expect(loadMemoryAgentBench(p)).rejects.toThrow(/missing or unknown task/);
  });

  it('rejects sample with no context and no qa', async () => {
    const p = await writeSample([{ sample_id: 's1', task: 'AR', qa: [{ question: 'q', answer: 'a' }] }]);
    await expect(loadMemoryAgentBench(p)).rejects.toThrow(/missing context_turns/);
  });
});
