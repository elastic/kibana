import { readFile } from 'node:fs/promises';

import type {
  ImportRound,
  LoCoMoQA,
  LoCoMoSample,
  LoCoMoTurn,
  LongMemEvalItem,
  LongMemEvalTurn,
  Mem2ActGoldCall,
  Mem2ActSample,
  Mem2ActToolSchema,
  MemGroundAssistantMessageEvent,
  MemGroundEvent,
  MemGroundProbeEvent,
  MemGroundScenario,
  MemGroundScoringStrategy,
  MemGroundSessionBreakEvent,
  MemGroundUserMessageEvent,
  MemoryAgentBenchQA,
  MemoryAgentBenchSample,
  MemoryAgentBenchTask,
  MemoryAgentBenchTurn,
} from './types.js';

// ---------------------------------------------------------------------------
// LongMemEval
// ---------------------------------------------------------------------------

export const loadLongMemEval = async (path: string): Promise<LongMemEvalItem[]> => {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`LongMemEval dataset at ${path} is not an array.`);
  }
  return parsed.map((row, i) => validateLongMemEvalItem(row, i, path));
};

const validateLongMemEvalItem = (row: unknown, idx: number, path: string): LongMemEvalItem => {
  if (!row || typeof row !== 'object') {
    throw new Error(`LongMemEval[${idx}] in ${path}: not an object`);
  }
  const r = row as Record<string, unknown>;
  for (const key of [
    'question_id',
    'question_type',
    'question',
    'answer',
    'haystack_sessions',
    'haystack_session_ids',
    'haystack_dates',
  ]) {
    if (!(key in r)) {
      throw new Error(`LongMemEval[${idx}] in ${path}: missing field "${key}"`);
    }
  }
  return r as unknown as LongMemEvalItem;
};

/**
 * Pair a LongMemEval session into user/assistant rounds. The dataset is
 * strictly alternating user→assistant but we defensively handle:
 *  - leading assistant turns (skipped with a warning)
 *  - dangling final user turn (paired with empty assistant)
 *  - consecutive same-role turns (merged with `\n\n`)
 */
export const lmeSessionToRounds = (
  turns: LongMemEvalTurn[],
  options: { sessionDateIso?: string; questionId?: string; sessionIdx?: number } = {}
): ImportRound[] => {
  const normalized = mergeConsecutive(turns, (t) => t.role, (t) => t.content);
  const rounds: ImportRound[] = [];
  let pending: { user: string; ts?: string } | null = null;

  for (const turn of normalized) {
    if (turn.role === 'user') {
      if (pending) {
        rounds.push({
          user_message: pending.user,
          assistant_message: '',
          ...(pending.ts !== undefined ? { started_at: pending.ts } : {}),
        });
      }
      pending = { user: turn.content, ts: options.sessionDateIso };
    } else if (turn.role === 'assistant') {
      if (!pending) {
        // assistant without a preceding user — synthesize an empty user turn so
        // we preserve content; downstream will still pair correctly.
        pending = { user: '', ts: options.sessionDateIso };
      }
      rounds.push({
        user_message: pending.user,
        assistant_message: turn.content,
        ...(pending.ts !== undefined ? { started_at: pending.ts } : {}),
      });
      pending = null;
    }
  }
  if (pending) {
    rounds.push({
      user_message: pending.user,
      assistant_message: '',
      ...(pending.ts !== undefined ? { started_at: pending.ts } : {}),
    });
  }
  return rounds;
};

// ---------------------------------------------------------------------------
// LoCoMo
// ---------------------------------------------------------------------------

export const loadLoCoMo = async (path: string): Promise<LoCoMoSample[]> => {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`LoCoMo dataset at ${path} is not an array.`);
  }
  return parsed.map((row, i) => validateLoCoMoSample(row, i, path));
};

const validateLoCoMoSample = (row: unknown, idx: number, path: string): LoCoMoSample => {
  if (!row || typeof row !== 'object') {
    throw new Error(`LoCoMo[${idx}] in ${path}: not an object`);
  }
  const r = row as Record<string, unknown>;
  for (const key of ['sample_id', 'qa', 'conversation']) {
    if (!(key in r)) {
      throw new Error(`LoCoMo[${idx}] in ${path}: missing field "${key}"`);
    }
  }
  return r as unknown as LoCoMoSample;
};

export interface LoCoMoSession {
  index: number;
  /** `session_<n>` */
  key: string;
  dateRaw?: string;
  dateIso?: string;
  turns: LoCoMoTurn[];
}

/**
 * Walks a LoCoMoSample's `conversation` object and returns sessions ordered
 * by their numeric index. Skips empty sessions and surfaces the original
 * `session_N_date_time` string in `dateRaw`.
 */
export const locomoSessions = (sample: LoCoMoSample): LoCoMoSession[] => {
  const conv = sample.conversation;
  const sessions: LoCoMoSession[] = [];
  for (const key of Object.keys(conv)) {
    const m = key.match(/^session_(\d+)$/);
    if (!m) continue;
    const turns = (conv as Record<string, unknown>)[key];
    if (!Array.isArray(turns) || turns.length === 0) continue;
    const dateKey = `${key}_date_time`;
    const dateRaw =
      typeof (conv as Record<string, unknown>)[dateKey] === 'string'
        ? ((conv as Record<string, unknown>)[dateKey] as string)
        : undefined;
    sessions.push({
      index: Number(m[1]),
      key,
      dateRaw,
      dateIso: dateRaw ? parseLoCoMoDate(dateRaw) : undefined,
      turns: turns as LoCoMoTurn[],
    });
  }
  sessions.sort((a, b) => a.index - b.index);
  return sessions;
};

/**
 * Maps speaker_a → user, speaker_b → assistant. Consecutive turns from the
 * same speaker are merged with `\n\n`. Multimodal turns (img_url/blip_caption)
 * are flattened into `[image: <caption>]` plus the original text, so the
 * downstream agent sees something representable.
 */
export const locomoSessionToRounds = (
  session: LoCoMoSession,
  sample: LoCoMoSample
): ImportRound[] => {
  const speakerA = sample.conversation.speaker_a;
  const speakerB = sample.conversation.speaker_b;
  const role = (s: LoCoMoTurn): 'user' | 'assistant' | 'unknown' => {
    if (s.speaker === speakerA) return 'user';
    if (s.speaker === speakerB) return 'assistant';
    return 'unknown';
  };
  const flatten = (s: LoCoMoTurn): string => {
    const parts: string[] = [];
    if (s.blip_caption) parts.push(`[image: ${s.blip_caption}]`);
    if (s.text) parts.push(s.text);
    return parts.join(' ').trim();
  };
  const merged = mergeConsecutive(
    session.turns.map((t) => ({ ...t, _role: role(t) })),
    (t) => t._role,
    (t) => flatten(t)
  );

  const rounds: ImportRound[] = [];
  let pending: { user: string; ts?: string } | null = null;
  for (const turn of merged) {
    const r = turn._role;
    if (r === 'user') {
      if (pending) {
        rounds.push({
          user_message: pending.user,
          assistant_message: '',
          ...(pending.ts !== undefined ? { started_at: pending.ts } : {}),
        });
      }
      pending = { user: turn.content, ts: session.dateIso };
    } else if (r === 'assistant') {
      if (!pending) pending = { user: '', ts: session.dateIso };
      rounds.push({
        user_message: pending.user,
        assistant_message: turn.content,
        ...(pending.ts !== undefined ? { started_at: pending.ts } : {}),
      });
      pending = null;
    } else {
      // unknown speaker — fold into pending user turn so content is preserved
      if (!pending) pending = { user: turn.content, ts: session.dateIso };
      else pending.user += `\n\n${turn.content}`;
    }
  }
  if (pending) {
    rounds.push({
      user_message: pending.user,
      assistant_message: '',
      ...(pending.ts !== undefined ? { started_at: pending.ts } : {}),
    });
  }
  return rounds;
};

/** LoCoMo QA gold answer normalization (numbers/lists → strings). */
export const locomoGoldAnswer = (qa: LoCoMoQA): string => {
  if (qa.answer != null) {
    if (Array.isArray(qa.answer)) return qa.answer.join(', ');
    return String(qa.answer);
  }
  if (qa.adversarial_answer) return qa.adversarial_answer;
  return '';
};

// ---------------------------------------------------------------------------
// Timestamp parsers
// ---------------------------------------------------------------------------

/**
 * Parse LongMemEval dates like `"2023/05/30 (Tue) 23:40"`.
 * Returns an ISO string or `undefined` if the format is unrecognized.
 */
export const parseLongMemEvalDate = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/^\s*(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s*\([^)]+\))?\s+(\d{1,2}):(\d{1,2})/);
  if (!m) return undefined;
  const [, yy, mo, dd, hh, mm] = m;
  const iso = new Date(
    Date.UTC(Number(yy), Number(mo) - 1, Number(dd), Number(hh), Number(mm), 0)
  );
  if (Number.isNaN(iso.valueOf())) return undefined;
  return iso.toISOString();
};

const LOCOMO_MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parse LoCoMo dates like `"1:56 pm on 8 May, 2023"` and
 * `"11:00 am on 14 February, 2023"`. Returns an ISO string or `undefined`.
 */
export const parseLoCoMoDate = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const m = raw
    .toLowerCase()
    .match(/^\s*(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?\s*(?:on)?\s*(\d{1,2})\s+([a-z]+),?\s+(\d{4})/);
  if (!m) return undefined;
  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const ampm = m[3];
  const day = Number(m[4]);
  const month = LOCOMO_MONTHS[m[5] ?? ''];
  const year = Number(m[6]);
  if (month === undefined) return undefined;
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  const d = new Date(Date.UTC(year, month, day, hour, minute, 0));
  if (Number.isNaN(d.valueOf())) return undefined;
  return d.toISOString();
};

// ---------------------------------------------------------------------------
// MemoryAgentBench
// ---------------------------------------------------------------------------

const canonAlias = (s: string): string =>
  s.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

const MAB_TASK_ALIASES: Record<string, MemoryAgentBenchTask> = Object.fromEntries(
  (
    [
      ['ar', 'AR'],
      ['accurate retrieval', 'AR'],
      ['retrieval', 'AR'],
      ['ttl', 'TTL'],
      ['test time learning', 'TTL'],
      ['in context learning', 'TTL'],
      ['icl', 'TTL'],
      ['lru', 'LRU'],
      ['long range understanding', 'LRU'],
      ['long range', 'LRU'],
      ['cr', 'CR'],
      ['conflict resolution', 'CR'],
    ] as const
  ).map(([k, v]) => [canonAlias(k), v])
);

export const normalizeMabTask = (raw: string | undefined): MemoryAgentBenchTask | undefined => {
  if (!raw) return undefined;
  const key = canonAlias(raw);
  if (MAB_TASK_ALIASES[key]) return MAB_TASK_ALIASES[key];
  const upper = raw.trim().toUpperCase();
  if (upper === 'AR' || upper === 'TTL' || upper === 'LRU' || upper === 'CR') {
    return upper as MemoryAgentBenchTask;
  }
  return undefined;
};

/**
 * Load MemoryAgentBench data. Accepts:
 *  - An array of samples (canonical).
 *  - An object `{ samples: [...] }` (alt format).
 *  - An object `{ data: [...] }` (HF-style).
 *  - A keyed-by-task object `{ AR: [...], TTL: [...] }`.
 */
export const loadMemoryAgentBench = async (path: string): Promise<MemoryAgentBenchSample[]> => {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw);
  const items = flattenMab(parsed);
  return items.map((row, idx) => normalizeMabSample(row, idx, path));
};

const flattenMab = (parsed: unknown): unknown[] => {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.samples)) return o.samples;
    if (Array.isArray(o.data)) return o.data;
    // Keyed-by-task form: pull arrays and stamp task on each.
    const out: unknown[] = [];
    for (const [key, val] of Object.entries(o)) {
      if (Array.isArray(val)) {
        for (const v of val) {
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            out.push({ task_type: key, ...(v as Record<string, unknown>) });
          }
        }
      }
    }
    if (out.length > 0) return out;
  }
  throw new Error('MemoryAgentBench dataset must be an array, { samples: [...] }, { data: [...] }, or task-keyed object.');
};

const pickString = (...vals: unknown[]): string | undefined => {
  for (const v of vals) {
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
};

const coerceTurns = (raw: unknown): MemoryAgentBenchTurn[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const out: MemoryAgentBenchTurn[] = [];
  for (const t of raw) {
    if (!t || typeof t !== 'object') continue;
    const role = (t as Record<string, unknown>).role;
    const content =
      (t as Record<string, unknown>).content ??
      (t as Record<string, unknown>).text ??
      (t as Record<string, unknown>).message;
    if ((role === 'user' || role === 'assistant') && typeof content === 'string') {
      out.push({ role, content });
    }
  }
  return out.length > 0 ? out : undefined;
};

const coerceDocs = (raw: unknown): string[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.filter((d): d is string => typeof d === 'string' && d.length > 0);
  return out.length > 0 ? out : undefined;
};

const coerceQa = (raw: unknown): MemoryAgentBenchQA[] => {
  if (!Array.isArray(raw)) return [];
  const out: MemoryAgentBenchQA[] = [];
  for (const q of raw) {
    if (!q || typeof q !== 'object') continue;
    const r = q as Record<string, unknown>;
    const question = pickString(r.question, r.q, r.input);
    if (!question) continue;
    const entry: MemoryAgentBenchQA = {
      question,
      answer: r.answer ?? r.gold_answer ?? r.target ?? '',
    };
    const qid = pickString(r.qa_id, r.id);
    if (qid) entry.qa_id = qid;
    const ev = r.evidence ?? r.support;
    if (ev !== undefined && ev !== null) entry.evidence = ev as string[] | string;
    const subTask = pickString(r.task, r.task_type, r.category);
    if (subTask) entry.task = subTask;
    out.push(entry);
  }
  return out;
};

const normalizeMabSample = (
  row: unknown,
  idx: number,
  path: string
): MemoryAgentBenchSample => {
  if (!row || typeof row !== 'object') {
    throw new Error(`MemoryAgentBench[${idx}] in ${path}: not an object`);
  }
  const r = row as Record<string, unknown>;
  const sampleId =
    pickString(r.sample_id, r.id, r.task_id, r.uuid) ?? `mab_${idx.toString().padStart(4, '0')}`;
  const rawTaskLabel = pickString(r.task, r.task_type, r.category);
  const task = normalizeMabTask(rawTaskLabel);
  if (!task) {
    throw new Error(
      `MemoryAgentBench[${idx}] (sample_id=${sampleId}) in ${path}: missing or unknown task ("${rawTaskLabel ?? ''}"). Expected AR / TTL / LRU / CR.`
    );
  }
  const turns = coerceTurns(r.context_turns ?? r.context ?? r.history ?? r.dialogue);
  const docs = coerceDocs(r.context_documents ?? r.documents ?? r.passages);
  // Some MAB packs use a single long string as "context".
  const docString =
    typeof r.context === 'string' && (r.context as string).length > 0
      ? [r.context as string]
      : undefined;
  const finalDocs = docs ?? docString;
  if (!turns && !finalDocs) {
    throw new Error(
      `MemoryAgentBench[${idx}] (sample_id=${sampleId}) in ${path}: missing context_turns / context_documents / context.`
    );
  }
  const qa = coerceQa(r.qa ?? r.questions);
  if (qa.length === 0) {
    throw new Error(
      `MemoryAgentBench[${idx}] (sample_id=${sampleId}) in ${path}: must contain at least one qa entry.`
    );
  }
  const sample: MemoryAgentBenchSample = { sample_id: sampleId, task, qa };
  if (rawTaskLabel) sample.task_label = rawTaskLabel;
  const title = pickString(r.title, r.name);
  if (title) sample.title = title;
  if (turns) sample.context_turns = turns;
  if (finalDocs) sample.context_documents = finalDocs;
  if (r.metadata && typeof r.metadata === 'object') {
    sample.metadata = r.metadata as Record<string, unknown>;
  }
  return sample;
};

/** Pair MemoryAgentBench `context_turns` into ImportRounds. */
export const mabTurnsToRounds = (turns: MemoryAgentBenchTurn[]): ImportRound[] => {
  return lmeSessionToRounds(turns as unknown as LongMemEvalTurn[]);
};

/**
 * Slice a list of long passages into one synthetic round per passage. The
 * synthetic user turn is a stable prompt ("Here's a document I read...") so
 * the assistant response (the passage) is what carries the data.
 */
export const mabDocumentsToRounds = (
  docs: string[],
  options: { userPrompt?: string } = {}
): ImportRound[] => {
  const prompt = options.userPrompt ?? "I'm sharing the following document for future reference.";
  return docs.map((doc) => ({
    user_message: prompt,
    assistant_message: doc,
  }));
};

/** Chunk an array of ImportRounds into sessions of at most `chunkSize` rounds. */
export const chunkRoundsIntoSessions = (
  rounds: ImportRound[],
  chunkSize: number
): ImportRound[][] => {
  if (chunkSize <= 0) return [rounds];
  const out: ImportRound[][] = [];
  for (let i = 0; i < rounds.length; i += chunkSize) {
    out.push(rounds.slice(i, i + chunkSize));
  }
  return out;
};

export const mabGoldAnswer = (qa: MemoryAgentBenchQA): string => {
  const a = qa.answer;
  if (a == null) return '';
  if (Array.isArray(a)) return a.map((v) => String(v)).join(', ');
  return String(a);
};

// ---------------------------------------------------------------------------
// Mem2ActBench
// ---------------------------------------------------------------------------

/**
 * Load Mem2ActBench data. Accepts the same array / `{ samples }` / `{ data }`
 * wrappers as MAB. Some Mem2Act packs ship the tool schema at the file root
 * (shared across all samples); the loader propagates it to each sample when
 * none is set inline.
 */
export const loadMem2Act = async (path: string): Promise<Mem2ActSample[]> => {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw);
  let items: unknown[];
  let sharedTools: Mem2ActToolSchema[] | undefined;
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>;
    items = (Array.isArray(o.samples) ? o.samples : Array.isArray(o.data) ? o.data : null) ?? [];
    if (Array.isArray(o.tool_schemas)) sharedTools = coerceToolSchemas(o.tool_schemas);
  } else {
    throw new Error(`Mem2ActBench dataset at ${path} must be an array or { samples: [...] }`);
  }
  if (items.length === 0) throw new Error(`Mem2ActBench dataset at ${path} is empty.`);
  return items.map((row, idx) => normalizeMem2ActSample(row, idx, path, sharedTools));
};

const coerceToolSchemas = (raw: unknown): Mem2ActToolSchema[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const out: Mem2ActToolSchema[] = [];
  for (const t of raw) {
    if (!t || typeof t !== 'object') continue;
    const r = t as Record<string, unknown>;
    const name = pickString(r.name, r.tool_id, r.id);
    if (!name) continue;
    const tool: Mem2ActToolSchema = { name };
    const desc = pickString(r.description);
    if (desc) tool.description = desc;
    const params = r.parameters ?? r.params ?? r.input_schema ?? r.schema;
    if (params && typeof params === 'object') tool.parameters = params as Record<string, unknown>;
    out.push(tool);
  }
  return out.length > 0 ? out : undefined;
};

const coerceGoldCalls = (raw: unknown): Mem2ActGoldCall[] => {
  if (!Array.isArray(raw)) return [];
  const out: Mem2ActGoldCall[] = [];
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue;
    const r = c as Record<string, unknown>;
    const tool = pickString(r.tool_id, r.tool, r.name);
    if (!tool) continue;
    const call: Mem2ActGoldCall = { tool_id: tool };
    const params = r.params ?? r.arguments ?? r.input;
    if (params && typeof params === 'object') call.params = params as Record<string, unknown>;
    out.push(call);
  }
  return out;
};

const coerceDialogue = (raw: unknown): Mem2ActSample['dialogue'] => {
  if (!Array.isArray(raw)) return [];
  const out: Mem2ActSample['dialogue'] = [];
  for (const t of raw) {
    if (!t || typeof t !== 'object') continue;
    const r = t as Record<string, unknown>;
    const role = r.role;
    const content = pickString(r.content, r.text, r.message);
    if ((role === 'user' || role === 'assistant') && content) {
      out.push({ role, content });
    }
  }
  return out;
};

const normalizeMem2ActSample = (
  row: unknown,
  idx: number,
  path: string,
  sharedTools?: Mem2ActToolSchema[]
): Mem2ActSample => {
  if (!row || typeof row !== 'object') {
    throw new Error(`Mem2ActBench[${idx}] in ${path}: not an object`);
  }
  const r = row as Record<string, unknown>;
  const sampleId =
    pickString(r.sample_id, r.id, r.task_id, r.uuid) ??
    `mem2act_${idx.toString().padStart(4, '0')}`;
  const dialogue = coerceDialogue(r.dialogue ?? r.history ?? r.context);
  const query = pickString(r.query, r.question, r.input, r.user);
  if (!query) {
    throw new Error(
      `Mem2ActBench[${idx}] (sample_id=${sampleId}) in ${path}: missing query/question.`
    );
  }
  const gold = coerceGoldCalls(r.gold_calls ?? r.gold ?? r.expected_tool_calls ?? r.tool_calls);
  if (gold.length === 0) {
    throw new Error(
      `Mem2ActBench[${idx}] (sample_id=${sampleId}) in ${path}: must list at least one gold tool call.`
    );
  }
  const inlineTools = coerceToolSchemas(r.tool_schemas ?? r.tools);
  const sample: Mem2ActSample = {
    sample_id: sampleId,
    dialogue,
    query,
    gold_calls: gold,
  };
  const tools = inlineTools ?? sharedTools;
  if (tools) sample.tool_schemas = tools;
  const category = pickString(r.category, r.task, r.task_type);
  if (category) sample.category = category;
  if (r.metadata && typeof r.metadata === 'object') {
    sample.metadata = r.metadata as Record<string, unknown>;
  }
  return sample;
};

/** Pair Mem2Act dialogue turns into ImportRounds. */
export const mem2ActDialogueToRounds = (dialogue: Mem2ActSample['dialogue']): ImportRound[] => {
  return lmeSessionToRounds(dialogue as unknown as LongMemEvalTurn[]);
};

// ---------------------------------------------------------------------------
// MemGround
// ---------------------------------------------------------------------------

const MEMGROUND_SCORING: Record<string, MemGroundScoringStrategy> = {
  judge: 'judge',
  llm: 'judge',
  exact: 'exact',
  substring: 'exact',
  contains: 'exact',
  tool: 'tool_call',
  tool_call: 'tool_call',
  tool_calls: 'tool_call',
  action: 'tool_call',
};

const normalizeScoring = (raw: unknown): MemGroundScoringStrategy | undefined => {
  if (typeof raw !== 'string') return undefined;
  return MEMGROUND_SCORING[raw.trim().toLowerCase()];
};

const EVENT_TYPE_ALIASES: Record<string, MemGroundEvent['type']> = {
  user: 'user_message',
  user_message: 'user_message',
  user_turn: 'user_message',
  human: 'user_message',
  assistant: 'assistant_message',
  assistant_message: 'assistant_message',
  assistant_turn: 'assistant_message',
  agent: 'assistant_message',
  ai: 'assistant_message',
  session_break: 'session_break',
  break: 'session_break',
  new_session: 'session_break',
  next_session: 'session_break',
  probe: 'probe',
  question: 'probe',
  question_answer: 'probe',
  qa: 'probe',
};

const normalizeEventType = (raw: unknown): MemGroundEvent['type'] | undefined => {
  if (typeof raw !== 'string') return undefined;
  return EVENT_TYPE_ALIASES[raw.trim().toLowerCase()];
};

/**
 * Load a MemGround scenario file. Accepts either a single scenario object or
 * an array / `{ scenarios: [...] }` wrapper. The schema is permissive: any
 * known synonyms for event types are normalized (`user → user_message`,
 * `qa → probe`, etc.) and unknown events raise a clear error.
 */
export const loadMemGround = async (path: string): Promise<MemGroundScenario[]> => {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw);
  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.scenarios)) items = o.scenarios;
    else if (Array.isArray(o.samples)) items = o.samples;
    else if (Array.isArray(o.data)) items = o.data;
    // Treat the root object as a single scenario when it has events.
    else if (Array.isArray(o.events)) items = [o];
    else {
      throw new Error(
        `MemGround dataset at ${path}: expected array, { scenarios: [...] }, or a single { events: [...] } object.`
      );
    }
  } else {
    throw new Error(`MemGround dataset at ${path} must be an object or array.`);
  }
  if (items.length === 0) throw new Error(`MemGround dataset at ${path} is empty.`);
  return items.map((row, idx) => normalizeMemGroundScenario(row, idx, path));
};

const normalizeMemGroundScenario = (
  row: unknown,
  idx: number,
  path: string
): MemGroundScenario => {
  if (!row || typeof row !== 'object') {
    throw new Error(`MemGround[${idx}] in ${path}: not an object`);
  }
  const r = row as Record<string, unknown>;
  const scenarioId =
    pickString(r.scenario_id, r.id, r.task_id, r.uuid) ?? `mg_${idx.toString().padStart(4, '0')}`;
  const rawEvents = r.events ?? r.timeline ?? r.steps;
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    throw new Error(`MemGround[${idx}] (scenario_id=${scenarioId}) in ${path}: events array is empty or missing.`);
  }
  const events: MemGroundEvent[] = rawEvents.map((e, i) =>
    normalizeMemGroundEvent(e, i, scenarioId, path)
  );
  if (events.every((e) => e.type !== 'probe')) {
    throw new Error(
      `MemGround[${idx}] (scenario_id=${scenarioId}) in ${path}: scenario must include at least one probe.`
    );
  }
  const scenario: MemGroundScenario = { scenario_id: scenarioId, events };
  const title = pickString(r.title, r.name);
  if (title) scenario.title = title;
  const category = pickString(r.category, r.task, r.task_type);
  if (category) scenario.category = category;
  const ds = normalizeScoring(r.default_scoring ?? r.scoring);
  if (ds) scenario.default_scoring = ds;
  if (r.metadata && typeof r.metadata === 'object') {
    scenario.metadata = r.metadata as Record<string, unknown>;
  }
  return scenario;
};

const normalizeMemGroundEvent = (
  raw: unknown,
  i: number,
  scenarioId: string,
  path: string
): MemGroundEvent => {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`MemGround scenario "${scenarioId}" event[${i}] in ${path}: not an object`);
  }
  const r = raw as Record<string, unknown>;
  // Short-form: `{ user: "...", assistant: "..." }`
  if (typeof r.user === 'string' && typeof r.assistant === 'string' && !r.type) {
    return {
      type: 'user_message',
      content: r.user,
      ...(typeof r.timestamp === 'string' ? { timestamp: r.timestamp } : {}),
    };
  }
  // Probe short-form: `{ q: "...", a: "..." }`
  if ((r.q !== undefined || r.question !== undefined) && !r.type) {
    return normalizeProbeEvent(r, i, scenarioId, path);
  }
  const type = normalizeEventType(r.type ?? r.role);
  if (!type) {
    throw new Error(
      `MemGround scenario "${scenarioId}" event[${i}] in ${path}: unknown type "${String(r.type ?? r.role ?? '')}". Expected user_message/assistant_message/session_break/probe.`
    );
  }
  switch (type) {
    case 'user_message':
    case 'assistant_message': {
      const content = pickString(r.content, r.text, r.message);
      if (!content) {
        throw new Error(
          `MemGround scenario "${scenarioId}" event[${i}] in ${path}: ${type} requires content/text/message.`
        );
      }
      const ev: MemGroundUserMessageEvent | MemGroundAssistantMessageEvent = {
        type,
        content,
      } as MemGroundUserMessageEvent | MemGroundAssistantMessageEvent;
      const ts = pickString(r.timestamp);
      if (ts) ev.timestamp = ts;
      const id = pickString(r.event_id, r.id);
      if (id) ev.event_id = id;
      return ev;
    }
    case 'session_break': {
      const ev: MemGroundEvent = { type: 'session_break' };
      const title = pickString(r.next_session_title, r.title);
      if (title) (ev as MemGroundSessionBreakEvent).next_session_title = title;
      const ts = pickString(r.timestamp);
      if (ts) ev.timestamp = ts;
      const id = pickString(r.event_id, r.id);
      if (id) ev.event_id = id;
      return ev;
    }
    case 'probe':
      return normalizeProbeEvent(r, i, scenarioId, path);
  }
};

const normalizeProbeEvent = (
  r: Record<string, unknown>,
  i: number,
  scenarioId: string,
  path: string
): MemGroundProbeEvent => {
  const question = pickString(r.question, r.q, r.input, r.prompt);
  if (!question) {
    throw new Error(
      `MemGround scenario "${scenarioId}" event[${i}] in ${path}: probe requires question/q/input.`
    );
  }
  const answer = pickString(r.answer, r.a, r.gold_answer, r.target);
  const scoring = normalizeScoring(r.scoring ?? r.score) ?? undefined;
  const ev: MemGroundProbeEvent = { type: 'probe', question };
  if (answer !== undefined) ev.answer = answer;
  if (scoring) ev.scoring = scoring;
  const cat = pickString(r.category, r.task);
  if (cat) ev.category = cat;
  const exactRegex = r.exact_regex ?? r.regex;
  if (typeof exactRegex === 'boolean') ev.exact_regex = exactRegex;
  const goldRaw = r.gold_calls ?? r.gold ?? r.expected_tool_calls ?? r.tool_calls;
  if (Array.isArray(goldRaw)) {
    const gold: Mem2ActGoldCall[] = [];
    for (const c of goldRaw) {
      if (!c || typeof c !== 'object') continue;
      const cr = c as Record<string, unknown>;
      const tool = pickString(cr.tool_id, cr.tool, cr.name);
      if (!tool) continue;
      const call: Mem2ActGoldCall = { tool_id: tool };
      const params = cr.params ?? cr.arguments ?? cr.input;
      if (params && typeof params === 'object') call.params = params as Record<string, unknown>;
      gold.push(call);
    }
    if (gold.length > 0) ev.gold_calls = gold;
  }
  const mode = pickString(r.score_mode);
  if (mode === 'strict' || mode === 'unordered' || mode === 'permissive') ev.score_mode = mode;
  const ts = pickString(r.timestamp);
  if (ts) ev.timestamp = ts;
  const id = pickString(r.event_id, r.id);
  if (id) ev.event_id = id;

  if (ev.scoring === 'tool_call' && !ev.gold_calls) {
    throw new Error(
      `MemGround scenario "${scenarioId}" event[${i}] in ${path}: tool_call probe requires gold_calls.`
    );
  }
  if (ev.scoring !== 'tool_call' && !ev.answer) {
    // Default scoring is judge/exact, which needs an answer. We leave it unset
    // so the runner can fall back to scenario.default_scoring if appropriate,
    // but warn at runtime when probe has neither answer nor gold_calls.
  }
  return ev;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mergeConsecutive = <T, K>(
  items: T[],
  key: (t: T) => K,
  text: (t: T) => string
): Array<T & { content: string }> => {
  const out: Array<T & { content: string }> = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && key(last) === key(item)) {
      last.content = `${last.content}\n\n${text(item)}`.trim();
    } else {
      out.push({ ...item, content: text(item).trim() });
    }
  }
  return out;
};
