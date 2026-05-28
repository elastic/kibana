import { describe, expect, it, vi } from 'vitest';

import { AnthropicJudge, createJudge, lmePrompt, locomoPrompt, NoopJudge, OpenAIJudge } from '../judge.js';

describe('lmePrompt', () => {
  it('uses default template for unknown category and substitutes vars', () => {
    const out = lmePrompt({
      question: 'where do I take yoga?',
      gold_answer: 'Serenity Yoga',
      predicted_answer: 'Serenity Yoga',
      category: 'made-up-category',
    });
    expect(out).toContain('where do I take yoga?');
    expect(out).toContain('Serenity Yoga');
    expect(out).toContain('yes or no');
  });

  it('uses temporal template and substitutes question_date', () => {
    const out = lmePrompt({
      question: 'when?',
      gold_answer: '2023-05-30',
      predicted_answer: 'last Tuesday',
      category: 'temporal-reasoning',
      context: { question_date: '2023/06/05 (Mon) 12:00' },
    });
    expect(out).toContain('Question Date: 2023/06/05');
  });

  it('uses unanswerable template for single-session-assistant', () => {
    const out = lmePrompt({
      question: 'unanswerable',
      gold_answer: 'irrelevant',
      predicted_answer: 'no info',
      category: 'single-session-assistant',
    });
    expect(out).toContain('unanswerable question');
    expect(out).toContain('Explanation:');
  });

  it('uses preference template for single-session-preference', () => {
    const out = lmePrompt({
      question: 'q',
      gold_answer: 'rubric text',
      predicted_answer: 'response',
      category: 'single-session-preference',
    });
    expect(out).toContain('Rubric:');
  });
});

describe('locomoPrompt', () => {
  it('supports numeric category keys', () => {
    expect(locomoPrompt({ question: 'q', gold_answer: 'a', predicted_answer: 'b', category: '1' }))
      .toContain('single-hop question');
  });
  it('uses adversarial template for category 5', () => {
    expect(
      locomoPrompt({ question: 'q', gold_answer: 'bad', predicted_answer: 'good', category: '5' })
    ).toContain('adversarial');
  });
});

describe('NoopJudge', () => {
  it('always returns null', async () => {
    const j = new NoopJudge();
    expect(await j.score({ question: 'q', gold_answer: 'a', predicted_answer: 'b', category: '' }))
      .toBeNull();
  });
});

describe('createJudge factory', () => {
  it('returns NoopJudge for mode=none', () => {
    expect(createJudge({ mode: 'none', benchmark: 'longmemeval' }).name).toBe('noop');
  });

  it('returns NoopJudge for mode=auto when no keys are set', () => {
    expect(createJudge({ mode: 'auto', benchmark: 'longmemeval' }).name).toBe('noop');
  });

  it('returns Anthropic when key is set under auto', () => {
    expect(
      createJudge({ mode: 'auto', benchmark: 'longmemeval', anthropicKey: 'x' }).name
    ).toBe('anthropic');
  });

  it('prefers Anthropic over OpenAI under auto', () => {
    expect(
      createJudge({
        mode: 'auto',
        benchmark: 'locomo',
        anthropicKey: 'a',
        openaiKey: 'o',
      }).name
    ).toBe('anthropic');
  });

  it('returns OpenAI judge when explicitly requested', () => {
    expect(
      createJudge({ mode: 'openai', benchmark: 'locomo', openaiKey: 'k' }).name
    ).toBe('openai');
  });

  it('throws when judge requested without key', () => {
    expect(() => createJudge({ mode: 'anthropic', benchmark: 'longmemeval' })).toThrow(
      /ANTHROPIC_API_KEY/
    );
  });

  it('throws on unknown mode', () => {
    expect(() => createJudge({ mode: 'wat', benchmark: 'longmemeval' })).toThrow(/not one of/);
  });
});

describe('AnthropicJudge', () => {
  it('POSTs to /v1/messages and parses yes', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ content: [{ type: 'text', text: 'yes' }] }), { status: 200 })
    ) as unknown as typeof fetch;
    const judge = new AnthropicJudge({
      apiKey: 'k',
      benchmark: 'longmemeval',
      fetch: fetchImpl,
    });
    const result = await judge.score({
      question: 'q',
      gold_answer: 'a',
      predicted_answer: 'a',
      category: 'multi-session',
    });
    expect(result?.score).toBe(1);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const url = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
  });

  it('parses partial', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ content: [{ text: 'partial — close enough' }] }), {
        status: 200,
      })
    ) as unknown as typeof fetch;
    const judge = new AnthropicJudge({
      apiKey: 'k',
      benchmark: 'locomo',
      fetch: fetchImpl,
    });
    const r = await judge.score({
      question: 'q',
      gold_answer: 'a',
      predicted_answer: 'a-ish',
      category: '1',
    });
    expect(r?.score).toBe(0.5);
    expect(r?.partial).toBe(true);
  });

  it('surfaces non-2xx responses', async () => {
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 })) as unknown as typeof fetch;
    const judge = new AnthropicJudge({ apiKey: 'k', benchmark: 'longmemeval', fetch: fetchImpl });
    await expect(
      judge.score({ question: 'q', gold_answer: 'a', predicted_answer: 'b', category: 'multi-session' })
    ).rejects.toThrow(/AnthropicJudge 500/);
  });
});

describe('OpenAIJudge', () => {
  it('parses no', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'No, the answer is wrong.' } }] }),
        { status: 200 }
      )
    ) as unknown as typeof fetch;
    const judge = new OpenAIJudge({ apiKey: 'k', benchmark: 'longmemeval', fetch: fetchImpl });
    const r = await judge.score({
      question: 'q',
      gold_answer: 'a',
      predicted_answer: 'b',
      category: 'knowledge-update',
    });
    expect(r?.score).toBe(0);
  });
});
