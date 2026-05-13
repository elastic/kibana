import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadMem2Act, mem2ActDialogueToRounds } from '../dataset.js';

describe('loadMem2Act', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mem2act-load-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const writeSample = async (data: unknown): Promise<string> => {
    const p = join(dir, 'mem2act.json');
    await writeFile(p, JSON.stringify(data), 'utf8');
    return p;
  };

  it('accepts plain array with inline tools and gold calls', async () => {
    const p = await writeSample([
      {
        sample_id: 'm1',
        dialogue: [
          { role: 'user', content: 'remember A=1' },
          { role: 'assistant', content: 'OK' },
        ],
        query: 'set B based on A',
        tool_schemas: [{ name: 'set_value', description: 'sets a value' }],
        gold_calls: [{ tool_id: 'set_value', params: { key: 'B', value: 1 } }],
      },
    ]);
    const samples = await loadMem2Act(p);
    expect(samples).toHaveLength(1);
    const s = samples[0]!;
    expect(s.sample_id).toBe('m1');
    expect(s.tool_schemas?.[0]?.name).toBe('set_value');
    expect(s.gold_calls).toEqual([{ tool_id: 'set_value', params: { key: 'B', value: 1 } }]);
  });

  it('inherits root-level tool_schemas if sample omits them', async () => {
    const p = await writeSample({
      tool_schemas: [{ name: 'shared_tool' }],
      samples: [
        {
          id: 'm2',
          dialogue: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hi' }],
          query: 'do thing',
          gold: [{ tool: 'shared_tool', arguments: { x: 1 } }],
        },
      ],
    });
    const [s] = await loadMem2Act(p);
    expect(s?.tool_schemas?.[0]?.name).toBe('shared_tool');
    expect(s?.gold_calls).toEqual([{ tool_id: 'shared_tool', params: { x: 1 } }]);
  });

  it('rejects sample without query', async () => {
    const p = await writeSample([
      {
        sample_id: 'm3',
        dialogue: [],
        gold_calls: [{ tool_id: 't' }],
      },
    ]);
    await expect(loadMem2Act(p)).rejects.toThrow(/missing query/);
  });

  it('rejects sample without gold calls', async () => {
    const p = await writeSample([
      {
        sample_id: 'm4',
        dialogue: [],
        query: 'q',
        gold_calls: [],
      },
    ]);
    await expect(loadMem2Act(p)).rejects.toThrow(/at least one gold tool call/);
  });

  it('rejects empty datasets', async () => {
    const p = await writeSample([]);
    await expect(loadMem2Act(p)).rejects.toThrow(/is empty/);
  });
});

describe('mem2ActDialogueToRounds', () => {
  it('pairs alternating turns', () => {
    const rounds = mem2ActDialogueToRounds([
      { role: 'user', content: 'u' },
      { role: 'assistant', content: 'a' },
      { role: 'user', content: 'u2' },
      { role: 'assistant', content: 'a2' },
    ]);
    expect(rounds).toHaveLength(2);
  });
});
