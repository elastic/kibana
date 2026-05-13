import { describe, expect, it, vi } from 'vitest';

import { AnthropicJudge, createJudge, mabPrompt, memgroundPrompt } from '../judge.js';

describe('mabPrompt', () => {
  it.each(['AR', 'TTL', 'LRU', 'CR'])('emits a per-task template for %s', (task) => {
    const out = mabPrompt({
      question: 'q',
      gold_answer: 'g',
      predicted_answer: 'p',
      category: task,
    });
    expect(out).toContain('q');
    expect(out).toContain('g');
    expect(out).toContain('p');
  });

  it('TTL prompt mentions learning', () => {
    expect(mabPrompt({ question: 'q', gold_answer: 'g', predicted_answer: 'p', category: 'TTL' }))
      .toMatch(/learn/i);
  });

  it('CR prompt mentions conflict/authoritative', () => {
    expect(mabPrompt({ question: 'q', gold_answer: 'g', predicted_answer: 'p', category: 'CR' }))
      .toMatch(/authoritative|conflict/i);
  });

  it('unknown category falls back to default template', () => {
    const out = mabPrompt({
      question: 'q',
      gold_answer: 'g',
      predicted_answer: 'p',
      category: 'unknown',
    });
    expect(out).toMatch(/yes\s*\/\s*partial\s*\/\s*no/i);
  });
});

describe('memgroundPrompt', () => {
  it('mentions grounding and accepts yes/partial/no', () => {
    const out = memgroundPrompt({
      question: 'Am I vegan?',
      gold_answer: 'no',
      predicted_answer: 'yes',
      category: '',
    });
    expect(out).toMatch(/grounding/i);
    expect(out).toMatch(/yes\s*\/\s*partial\s*\/\s*no/i);
    expect(out).toContain('Am I vegan?');
  });
});

describe('createJudge for memground', () => {
  it('NoopJudge under auto when no keys set', () => {
    expect(createJudge({ mode: 'auto', benchmark: 'memground' }).name).toBe('noop');
  });
});

describe('createJudge for memoryagentbench', () => {
  it('NoopJudge under auto when no keys set', () => {
    expect(createJudge({ mode: 'auto', benchmark: 'memoryagentbench' }).name).toBe('noop');
  });

  it('AnthropicJudge uses mabPrompt for MAB', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ content: [{ text: 'yes' }] }), { status: 200 })
    ) as unknown as typeof fetch;
    const judge = new AnthropicJudge({
      apiKey: 'k',
      benchmark: 'memoryagentbench',
      fetch: fetchImpl,
    });
    await judge.score({
      question: 'q',
      gold_answer: 'g',
      predicted_answer: 'p',
      category: 'AR',
    });
    const body = JSON.parse(
      (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]![1].body as string
    );
    expect(body.messages[0].content).toMatch(/Accurate Retrieval task/);
  });
});
