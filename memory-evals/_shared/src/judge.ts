/**
 * LLM-as-judge implementations for LongMemEval and LoCoMo.
 *
 * Prompts are adapted from the upstream evaluator scripts in the official
 * datasets. They are kept verbatim where possible so the resulting scores
 * remain comparable with the leaderboard.
 */

export interface JudgeRequest {
  question: string;
  gold_answer: string;
  predicted_answer: string;
  /** LongMemEval question_type or LoCoMo category. */
  category: string;
  /** Extra context for the judge (e.g. `question_date` for LME temporal). */
  context?: Record<string, unknown>;
}

export interface JudgeResult {
  /** 1 (correct), 0 (wrong), or 0.5 (partial). */
  score: number;
  partial?: boolean;
  reason?: string;
}

export interface Judge {
  readonly name: string;
  score(req: JudgeRequest): Promise<JudgeResult | null>;
}

export interface JudgeOptions {
  apiKey: string;
  model?: string;
  fetch?: typeof fetch;
  /** Sampling temperature; judges default to 0 for determinism. */
  temperature?: number;
}

// ---------------------------------------------------------------------------
// Prompt library
// ---------------------------------------------------------------------------

const LME_PROMPTS: Record<string, string> = {
  default: `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. If the response only contains a guess or hypothesis, answer no.

Question: {{question}}
Correct Answer: {{gold_answer}}
Model Response: {{predicted_answer}}
Is the model response correct? Answer yes or no only.`,
  'single-session-user': `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. If the response only contains a guess or hypothesis, answer no.

Question: {{question}}
Correct Answer: {{gold_answer}}
Model Response: {{predicted_answer}}
Is the model response correct? Answer yes or no only.`,
  'single-session-assistant': `I will give you an unanswerable question, an explanation, and a response from a model. Please answer yes if the model correctly identifies the question as unanswerable. The model could say that the information is incomplete, or some other information is given but the asked information is not.

Question: {{question}}
Explanation: {{gold_answer}}
Model Response: {{predicted_answer}}
Does the model correctly identify the question as unanswerable? Answer yes or no only.`,
  'single-session-preference': `I will give you a question, a rubric for desired personalized response, and a response from a model. Please answer yes if the response satisfies the desired response. Otherwise, answer no. The model does not need to reflect all the points in the rubric. The response is correct as long as it recalls and utilizes the user's personal information correctly.

Question: {{question}}
Rubric: {{gold_answer}}
Model Response: {{predicted_answer}}
Is the model response correct? Answer yes or no only.`,
  'multi-session': `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. If the response only contains a guess or hypothesis, answer no.

Question: {{question}}
Correct Answer: {{gold_answer}}
Model Response: {{predicted_answer}}
Is the model response correct? Answer yes or no only.`,
  'temporal-reasoning': `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response contains some previous time expressions but the final answer is correct, you should still answer yes. The question may be relative to a specific date.

Question: {{question}}
Question Date: {{question_date}}
Correct Answer: {{gold_answer}}
Model Response: {{predicted_answer}}
Is the model response correct? Answer yes or no only.`,
  'knowledge-update': `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response contains a different answer than the correct answer, you should answer no.

Question: {{question}}
Correct Answer: {{gold_answer}}
Model Response: {{predicted_answer}}
Is the model response correct? Answer yes or no only.`,
};

const LOCOMO_PROMPTS: Record<string, string> = {
  default: `I will give you a question, the correct answer, and a model's response. Decide whether the model response is correct.
- A response is correct if it matches the gold answer, even with different phrasing.
- For numeric, date, or list answers, the response must contain the same values.
- For multi-hop questions, the chain of reasoning need not be shown — the final answer must match.

Question: {{question}}
Gold Answer: {{gold_answer}}
Model Response: {{predicted_answer}}
Is the model response correct? Answer yes, partial, or no.
- "yes" = the answer is fully correct
- "partial" = the answer captures part of the gold answer but is incomplete
- "no" = the answer is wrong or unsupported`,
  '1': `I will give you a single-hop question grounded in a long-form dialogue, the correct answer, and a model response.

Question: {{question}}
Gold Answer: {{gold_answer}}
Model Response: {{predicted_answer}}

Answer yes if the model response is fully correct, partial if it captures the right entity but misses details, no otherwise.`,
  '2': `I will give you a multi-hop question, the correct answer, and a model response. The answer often requires combining facts from multiple sessions.

Question: {{question}}
Gold Answer: {{gold_answer}}
Model Response: {{predicted_answer}}

Answer yes if fully correct, partial if half-right, no otherwise.`,
  '3': `I will give you a temporal-reasoning question, the gold answer (often a date or duration), and a model response. Dates need to match exactly (or be equivalent: "2 May 2023" == "May 2, 2023").

Question: {{question}}
Gold Answer: {{gold_answer}}
Model Response: {{predicted_answer}}

Answer yes/partial/no.`,
  '4': `I will give you an open-domain knowledge question, the gold answer, and a model response.

Question: {{question}}
Gold Answer: {{gold_answer}}
Model Response: {{predicted_answer}}

Answer yes if fully correct, partial if half-right, no otherwise.`,
  '5': `I will give you an adversarial question (the gold "answer" is what an unfaithful model would say). A correct response refuses to assert the adversarial claim or correctly notes the question is unanswerable.

Question: {{question}}
Adversarial Answer (what to AVOID): {{gold_answer}}
Model Response: {{predicted_answer}}

Answer yes if the model avoids the adversarial answer (i.e., refuses or answers correctly), no if it repeats it.`,
};

const fillPrompt = (template: string, vars: Record<string, string | undefined>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
};

export const lmePrompt = (req: JudgeRequest): string => {
  const tmpl = LME_PROMPTS[req.category] ?? LME_PROMPTS.default!;
  return fillPrompt(tmpl, {
    question: req.question,
    gold_answer: req.gold_answer,
    predicted_answer: req.predicted_answer,
    question_date: typeof req.context?.question_date === 'string' ? req.context.question_date : '',
  });
};

export const locomoPrompt = (req: JudgeRequest): string => {
  const tmpl = LOCOMO_PROMPTS[req.category] ?? LOCOMO_PROMPTS.default!;
  return fillPrompt(tmpl, {
    question: req.question,
    gold_answer: req.gold_answer,
    predicted_answer: req.predicted_answer,
  });
};

const MAB_PROMPTS: Record<string, string> = {
  default: `I will give you a question, the gold answer, and a model's response.

Question: {{question}}
Gold Answer: {{gold_answer}}
Model Response: {{predicted_answer}}

Decide whether the model response is correct. Answer yes / partial / no.
- yes: the response captures the gold answer exactly (allow paraphrase).
- partial: the response is partially correct (right entity, missing detail).
- no: the response is wrong, evasive, or unsupported.`,
  AR: `Accurate Retrieval task — the gold answer is a specific fact recovered from a long context. The model response is correct iff it surfaces that fact.

Question: {{question}}
Gold Answer: {{gold_answer}}
Model Response: {{predicted_answer}}

Answer yes / partial / no.`,
  TTL: `Test-Time Learning task — the model was supposed to learn a rule / preference from earlier dialogue and apply it on this new question. A correct response applies the learned rule.

Question: {{question}}
Gold Answer / Rubric: {{gold_answer}}
Model Response: {{predicted_answer}}

Answer yes if the model applies the learned rule, partial if it shows partial knowledge of it, no otherwise.`,
  LRU: `Long-Range Understanding task — the answer requires multi-hop reasoning over a long context. Reasoning need not be shown; the final answer must match the gold.

Question: {{question}}
Gold Answer: {{gold_answer}}
Model Response: {{predicted_answer}}

Answer yes / partial / no.`,
  CR: `Conflict Resolution task — the context contains contradictory information. The correct answer follows the *latest* / *authoritative* fact as documented in the gold.

Question: {{question}}
Gold Answer (latest / authoritative): {{gold_answer}}
Model Response: {{predicted_answer}}

Answer yes if the model picks the authoritative answer, no if it picks the conflicting one, partial if it surfaces both without committing.`,
};

export const mabPrompt = (req: JudgeRequest): string => {
  const tmpl = MAB_PROMPTS[req.category] ?? MAB_PROMPTS.default!;
  return fillPrompt(tmpl, {
    question: req.question,
    gold_answer: req.gold_answer,
    predicted_answer: req.predicted_answer,
  });
};

const MEMGROUND_PROMPT = `MemGround grounding probe — given a scenario history that mixes long-term memory and the current dialogue, decide whether the model's response is grounded in the *latest authoritative* state captured by the gold answer.

Question: {{question}}
Gold (grounded) Answer: {{gold_answer}}
Model Response: {{predicted_answer}}

Answer yes / partial / no:
- yes: response captures the gold answer (paraphrases allowed).
- partial: response is on-topic but stale, hedged, or only partially correct.
- no: response is wrong, unsupported, or based on out-dated memory.`;

export const memgroundPrompt = (req: JudgeRequest): string =>
  fillPrompt(MEMGROUND_PROMPT, {
    question: req.question,
    gold_answer: req.gold_answer,
    predicted_answer: req.predicted_answer,
  });

const parseScoreText = (text: string): JudgeResult => {
  const lower = text.toLowerCase().trim();
  // Strip a leading "answer:" label if present.
  const stripped = lower.replace(/^answer:\s*/, '');
  const head = stripped.split(/[\s.,;:!?\n]+/)[0] ?? '';
  if (head === 'yes' || head === 'correct' || head === 'true') {
    return { score: 1, reason: text };
  }
  if (head === 'partial' || head === 'partially' || head === 'half') {
    return { score: 0.5, partial: true, reason: text };
  }
  if (head === 'no' || head === 'incorrect' || head === 'false') {
    return { score: 0, reason: text };
  }
  // Fall back to looking for the words anywhere.
  if (/\byes\b/.test(lower)) return { score: 1, reason: text };
  if (/\bpartial(ly)?\b/.test(lower)) return { score: 0.5, partial: true, reason: text };
  if (/\bno\b/.test(lower)) return { score: 0, reason: text };
  return { score: 0, reason: `unparseable: ${text}` };
};

// ---------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------

export class NoopJudge implements Judge {
  readonly name = 'noop';
  async score(_req: JudgeRequest): Promise<JudgeResult | null> {
    return null;
  }
}

type Provider = 'anthropic' | 'openai';

export type JudgeBenchmark = 'longmemeval' | 'locomo' | 'memoryagentbench' | 'memground';

interface BaseProviderJudgeOptions extends JudgeOptions {
  benchmark: JudgeBenchmark;
}

abstract class BaseProviderJudge implements Judge {
  abstract readonly name: string;
  protected readonly opts: BaseProviderJudgeOptions;
  protected readonly fetchImpl: typeof fetch;

  constructor(opts: BaseProviderJudgeOptions) {
    if (!opts.apiKey) throw new Error(`${this.constructor.name}: apiKey is required`);
    this.opts = opts;
    this.fetchImpl = opts.fetch ?? fetch;
  }

  protected buildPrompt(req: JudgeRequest): string {
    switch (this.opts.benchmark) {
      case 'longmemeval':
        return lmePrompt(req);
      case 'locomo':
        return locomoPrompt(req);
      case 'memoryagentbench':
        return mabPrompt(req);
      case 'memground':
        return memgroundPrompt(req);
    }
  }

  abstract score(req: JudgeRequest): Promise<JudgeResult | null>;
}

export class AnthropicJudge extends BaseProviderJudge {
  override readonly name = 'anthropic';

  override async score(req: JudgeRequest): Promise<JudgeResult | null> {
    const model = this.opts.model ?? 'claude-sonnet-4-5';
    const res = await this.fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.opts.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 64,
        temperature: this.opts.temperature ?? 0,
        messages: [{ role: 'user', content: this.buildPrompt(req) }],
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`AnthropicJudge ${res.status}: ${text.slice(0, 300)}`);
    }
    const parsed = JSON.parse(text);
    const content = Array.isArray(parsed?.content)
      ? parsed.content
          .map((c: { text?: string }) => (typeof c?.text === 'string' ? c.text : ''))
          .join('')
      : '';
    return parseScoreText(content);
  }
}

export class OpenAIJudge extends BaseProviderJudge {
  override readonly name = 'openai';

  override async score(req: JudgeRequest): Promise<JudgeResult | null> {
    const model = this.opts.model ?? 'gpt-4o-mini';
    const res = await this.fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.opts.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: this.opts.temperature ?? 0,
        max_tokens: 64,
        messages: [{ role: 'user', content: this.buildPrompt(req) }],
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`OpenAIJudge ${res.status}: ${text.slice(0, 300)}`);
    }
    const parsed = JSON.parse(text);
    const content: string = parsed?.choices?.[0]?.message?.content ?? '';
    return parseScoreText(content);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface CreateJudgeInput {
  /** `anthropic | openai | none | auto` */
  mode: string;
  benchmark: JudgeBenchmark;
  anthropicKey?: string;
  openaiKey?: string;
  model?: string;
}

export const createJudge = ({
  mode,
  benchmark,
  anthropicKey,
  openaiKey,
  model,
}: CreateJudgeInput): Judge => {
  const norm = mode.trim().toLowerCase();
  const pick = (provider: Provider): Judge => {
    if (provider === 'anthropic') {
      if (!anthropicKey) {
        throw new Error('KBN_JUDGE=anthropic but ANTHROPIC_API_KEY is unset');
      }
      return new AnthropicJudge({ apiKey: anthropicKey, model, benchmark });
    }
    if (!openaiKey) {
      throw new Error('KBN_JUDGE=openai but OPENAI_API_KEY is unset');
    }
    return new OpenAIJudge({ apiKey: openaiKey, model, benchmark });
  };
  switch (norm) {
    case 'none':
    case 'noop':
    case 'off':
      return new NoopJudge();
    case 'anthropic':
      return pick('anthropic');
    case 'openai':
      return pick('openai');
    case '':
    case 'auto':
      if (anthropicKey) return pick('anthropic');
      if (openaiKey) return pick('openai');
      return new NoopJudge();
    default:
      throw new Error(`KBN_JUDGE=${mode} is not one of: anthropic, openai, none, auto`);
  }
};
