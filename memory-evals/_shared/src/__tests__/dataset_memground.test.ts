import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadMemGround } from '../dataset.js';

describe('loadMemGround', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'memground-load-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const writeFixture = async (data: unknown): Promise<string> => {
    const p = join(dir, 'mg.json');
    await writeFile(p, JSON.stringify(data), 'utf8');
    return p;
  };

  it('accepts plain array of scenarios', async () => {
    const p = await writeFixture([
      {
        scenario_id: 's1',
        events: [
          { type: 'user_message', content: 'hi' },
          { type: 'assistant_message', content: 'hello' },
          { type: 'probe', question: 'what did I say?', answer: 'hi' },
        ],
      },
    ]);
    const scenarios = await loadMemGround(p);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]?.events).toHaveLength(3);
  });

  it('accepts { scenarios: [...] } wrapper', async () => {
    const p = await writeFixture({
      scenarios: [
        {
          scenario_id: 's2',
          events: [{ type: 'probe', question: 'q', answer: 'a' }],
        },
      ],
    });
    const scenarios = await loadMemGround(p);
    expect(scenarios[0]?.scenario_id).toBe('s2');
  });

  it('accepts single scenario at root when it has events', async () => {
    const p = await writeFixture({
      scenario_id: 'root',
      events: [{ type: 'probe', question: 'q', answer: 'a' }],
    });
    const scenarios = await loadMemGround(p);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]?.scenario_id).toBe('root');
  });

  it('normalises event type aliases', async () => {
    const p = await writeFixture([
      {
        scenario_id: 's3',
        events: [
          { type: 'user', content: 'hey' },
          { type: 'ai', content: 'hi back' },
          { type: 'new_session' },
          { type: 'agent', content: 'ready' },
          { type: 'qa', q: 'how?', a: 'fine' },
        ],
      },
    ]);
    const [s] = await loadMemGround(p);
    expect(s?.events.map((e) => e.type)).toEqual([
      'user_message',
      'assistant_message',
      'session_break',
      'assistant_message',
      'probe',
    ]);
  });

  it('accepts probe scoring aliases', async () => {
    const p = await writeFixture([
      {
        scenario_id: 's4',
        events: [
          { type: 'probe', question: 'q1', answer: 'a', scoring: 'contains' },
          { type: 'probe', question: 'q2', answer: 'a', scoring: 'llm' },
          {
            type: 'probe',
            question: 'q3',
            scoring: 'tool',
            gold_calls: [{ tool_id: 't' }],
          },
        ],
      },
    ]);
    const [s] = await loadMemGround(p);
    expect(s?.events).toMatchObject([
      { scoring: 'exact' },
      { scoring: 'judge' },
      { scoring: 'tool_call' },
    ]);
  });

  it('accepts the short-form { user, assistant } event', async () => {
    const p = await writeFixture([
      {
        scenario_id: 's5',
        events: [
          { user: 'morning', assistant: 'hey' },
          { type: 'probe', question: 'how did I greet?', answer: 'morning' },
        ],
      },
    ]);
    const [s] = await loadMemGround(p);
    expect(s?.events[0]).toMatchObject({ type: 'user_message', content: 'morning' });
  });

  it('rejects scenarios with no probes', async () => {
    const p = await writeFixture([
      {
        scenario_id: 'noprobe',
        events: [{ type: 'user_message', content: 'hi' }],
      },
    ]);
    await expect(loadMemGround(p)).rejects.toThrow(/at least one probe/);
  });

  it('rejects unknown event types with a clear error', async () => {
    const p = await writeFixture([
      {
        scenario_id: 'bad',
        events: [{ type: 'mystery', content: '...' }],
      },
    ]);
    await expect(loadMemGround(p)).rejects.toThrow(/unknown type/);
  });

  it('rejects tool_call probe without gold_calls', async () => {
    const p = await writeFixture([
      {
        scenario_id: 'badtool',
        events: [{ type: 'probe', question: 'q', scoring: 'tool_call' }],
      },
    ]);
    await expect(loadMemGround(p)).rejects.toThrow(/tool_call probe requires gold_calls/);
  });

  it('rejects empty datasets', async () => {
    const p = await writeFixture([]);
    await expect(loadMemGround(p)).rejects.toThrow(/empty/);
  });
});
