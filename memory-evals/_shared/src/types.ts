/**
 * Shared types for the memory-evals runners.
 *
 * These mirror the Kibana Agent Builder HTTP contracts but are intentionally
 * narrow: only the fields the runners actually read/write.
 */

// ---------------------------------------------------------------------------
// Kibana API request/response shapes (subset)
// ---------------------------------------------------------------------------

export interface ImportRound {
  user_message: string;
  assistant_message: string;
  /** ISO timestamp. */
  started_at?: string;
}

export interface ImportConversationRequest {
  agent_id: string;
  id?: string;
  title?: string;
  mode?: 'create' | 'overwrite';
  rounds: ImportRound[];
}

export interface ImportConversationResponse {
  conversation_id: string;
  round_count: number;
  created_at: string;
  updated_at: string;
}

export interface BulkDeleteRequest {
  conversation_ids?: string[];
  agent_id?: string;
  created_after?: string;
  created_before?: string;
  dry_run?: boolean;
}

export interface BulkDeleteResponse {
  deleted: number;
  matched: number;
  not_found: string[];
}

export interface ConverseRequest {
  agent_id: string;
  input: string;
  conversation_id?: string;
  connector_id?: string;
  persist?: boolean;
}

/**
 * Subset of {@link ChatResponse} the runners care about. Includes the raw
 * round payload so callers can inspect `steps[]` if they want to score tool
 * usage (Mem2Act-style) later.
 */
export interface ConverseResponse {
  conversation_id: string;
  round_id: string;
  response: {
    message?: string;
    [k: string]: unknown;
  };
  steps?: unknown[];
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// Tools (Mem2Act)
// ---------------------------------------------------------------------------

export interface BulkCreateMcpToolInput {
  name: string;
  description?: string;
}

export interface BulkCreateMcpToolsRequest {
  connector_id: string;
  tools: BulkCreateMcpToolInput[];
  namespace?: string;
  tags?: string[];
  skip_existing?: boolean;
}

export interface BulkCreateMcpToolResult {
  toolId?: string;
  success: boolean;
  /** Lower-cased name when the registration succeeds. */
  name?: string;
  reason?: { error?: { message?: string } };
  [k: string]: unknown;
}

export interface BulkCreateMcpToolsResponse {
  results: BulkCreateMcpToolResult[];
  summary: {
    requested: number;
    created: number;
    skipped: number;
    failed: number;
    [k: string]: unknown;
  };
}

export interface BulkDeleteToolsRequest {
  ids: string[];
  force?: boolean;
}

export interface BulkDeleteToolResult {
  toolId: string;
  success: boolean;
  reason?: unknown;
}

export interface BulkDeleteToolsResponse {
  results: BulkDeleteToolResult[];
}

export interface ListToolsResponseItem {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  /** MCP tools carry their namespace under metadata or tags depending on version. */
  namespace?: string;
  tags?: string[];
  [k: string]: unknown;
}

export type ListToolsResponse =
  | { results: ListToolsResponseItem[] }
  | { tools: ListToolsResponseItem[] }
  | ListToolsResponseItem[];

// ---------------------------------------------------------------------------
// Dataset shapes
// ---------------------------------------------------------------------------

export type LongMemEvalQuestionType =
  | 'single-session-user'
  | 'single-session-assistant'
  | 'single-session-preference'
  | 'multi-session'
  | 'temporal-reasoning'
  | 'knowledge-update';

export interface LongMemEvalTurn {
  role: 'user' | 'assistant';
  content: string;
  /** Some LME variants tag the answer-bearing turn explicitly. */
  has_answer?: boolean;
}

export interface LongMemEvalItem {
  question_id: string;
  question_type: LongMemEvalQuestionType;
  question: string;
  question_date: string;
  answer: string;
  answer_session_ids: string[];
  haystack_dates: string[];
  haystack_session_ids: string[];
  haystack_sessions: LongMemEvalTurn[][];
}

export interface LoCoMoTurn {
  speaker: string;
  dia_id: string;
  text: string;
  /** Some LoCoMo categories use blip_caption / img_url instead of text. */
  blip_caption?: string;
  img_url?: string;
}

export interface LoCoMoQA {
  question: string;
  /** Gold answer. May be string, number, list, depending on category. */
  answer: string | number | string[];
  /** Refs like `D1:3`. */
  evidence?: string[];
  /** 1..5 — LoCoMo category id. Some samples expose `category` as string. */
  category: number | string;
  /** Some variants use `adversarial_answer` for category 5. */
  adversarial_answer?: string;
}

export interface LoCoMoConversation {
  speaker_a: string;
  speaker_b: string;
  /** Dynamic keys: `session_N`, `session_N_date_time`. */
  [k: string]: unknown;
}

export interface LoCoMoSample {
  sample_id: string;
  qa: LoCoMoQA[];
  conversation: LoCoMoConversation;
  /** Optional metadata (event_summary, observation, session_summary). */
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// MemoryAgentBench
// ---------------------------------------------------------------------------

/**
 * Canonical MAB task families. Some upstream variants use the long names
 * (`Accurate Retrieval` etc.); the loader normalizes them to these short
 * codes so the judge prompts can be picked from a single map.
 */
export type MemoryAgentBenchTask = 'AR' | 'TTL' | 'LRU' | 'CR';

export interface MemoryAgentBenchTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface MemoryAgentBenchQA {
  /** Optional stable id; runner falls back to `<sample_id>:<idx>`. */
  qa_id?: string;
  question: string;
  /** Gold answer. Some MAB tasks emit numeric/bool/list — runner stringifies. */
  answer: unknown;
  /** Optional pointer back to evidence turns/documents. */
  evidence?: string[] | string;
  /** Optional per-question category override. */
  task?: string;
}

/**
 * Single MAB sample. Either `context_turns` (paired dialogue) or
 * `context_documents` (long passages chunked into synthetic rounds) must be
 * present. Some MAB packs ship `dialogue: string` which the loader treats as
 * a single user-turn document.
 */
export interface MemoryAgentBenchSample {
  sample_id: string;
  /** Short code (AR/TTL/LRU/CR). The loader infers from `task_type` strings. */
  task: MemoryAgentBenchTask;
  /** Original task label as it appeared in the file (for reporting). */
  task_label?: string;
  /** Optional human title — used as conversation title prefix. */
  title?: string;
  /** Pre-paired turns. Preferred over `context_documents`. */
  context_turns?: MemoryAgentBenchTurn[];
  /** Long passages. Runner ingests one per session by default. */
  context_documents?: string[];
  qa: MemoryAgentBenchQA[];
  /** Pass-through metadata (model_used, source_dataset, ...). */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Mem2ActBench
// ---------------------------------------------------------------------------

export interface Mem2ActToolSchema {
  name: string;
  description?: string;
  /** JSON-schema-like parameter spec. Opaque to the runner — passed through. */
  parameters?: Record<string, unknown>;
}

export interface Mem2ActGoldCall {
  tool_id: string;
  params?: Record<string, unknown>;
}

export interface Mem2ActSample {
  sample_id: string;
  /** Paired dialogue establishing the persistent state. */
  dialogue: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Optional list of tool schemas the agent should have access to. */
  tool_schemas?: Mem2ActToolSchema[];
  /** Final user query that should trigger gold tool calls. */
  query: string;
  /** Gold tool calls (in execution order). */
  gold_calls: Mem2ActGoldCall[];
  /** Optional category / split tag. */
  category?: string;
  /** Free-form metadata. */
  metadata?: Record<string, unknown>;
}

/** Observed tool call extracted from `steps[]` of a ConverseResponse. */
export interface Mem2ActToolCallObserved {
  tool_id: string;
  params: Record<string, unknown>;
  tool_call_id?: string;
}

// ---------------------------------------------------------------------------
// MemGround
// ---------------------------------------------------------------------------

/**
 * Strategy used to score a MemGround probe. Each probe declares its own
 * strategy; the runner picks the matching scorer.
 *  - `judge`: LLM-as-judge (default).
 *  - `exact`: case-insensitive substring or regex match against gold_answer.
 *  - `tool_call`: Mem2Act-style tool-call scoring.
 */
export type MemGroundScoringStrategy = 'judge' | 'exact' | 'tool_call';

export interface MemGroundEventBase {
  event_id?: string;
  /** ISO-8601 timestamp. Optional; used for documentation only — Kibana doesn't expose per-round timestamps via import yet. */
  timestamp?: string;
}

export interface MemGroundUserMessageEvent extends MemGroundEventBase {
  type: 'user_message';
  content: string;
}

export interface MemGroundAssistantMessageEvent extends MemGroundEventBase {
  type: 'assistant_message';
  content: string;
}

/**
 * Closes the current conversation and starts a new one. Used for multi-session
 * scenarios where the agent should rely on persisted memory across sessions
 * rather than chat history.
 */
export interface MemGroundSessionBreakEvent extends MemGroundEventBase {
  type: 'session_break';
  next_session_title?: string;
}

export interface MemGroundProbeEvent extends MemGroundEventBase {
  type: 'probe';
  question: string;
  /** Gold answer for judge / exact scoring. Optional for tool_call probes. */
  answer?: string;
  /**
   * Treat `answer` as a case-insensitive substring check. If false (default)
   * we fall back to:
   *  - regex match when the string starts and ends with `/`
   *  - case-insensitive substring otherwise
   */
  exact_regex?: boolean;
  /** Override the per-scenario / runner-wide scoring strategy. */
  scoring?: MemGroundScoringStrategy;
  /** Reporting category override. Falls back to scenario.category. */
  category?: string;
  /** Required for tool_call probes. */
  gold_calls?: Mem2ActGoldCall[];
  /** Score mode for tool_call probes (default: permissive). */
  score_mode?: 'strict' | 'unordered' | 'permissive';
}

export type MemGroundEvent =
  | MemGroundUserMessageEvent
  | MemGroundAssistantMessageEvent
  | MemGroundSessionBreakEvent
  | MemGroundProbeEvent;

export interface MemGroundScenario {
  scenario_id: string;
  title?: string;
  category?: string;
  /** Default scoring strategy for probes that don't set their own. */
  default_scoring?: MemGroundScoringStrategy;
  events: MemGroundEvent[];
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Run state / results
// ---------------------------------------------------------------------------

export interface QuestionResult {
  question_id: string;
  question_type?: string;
  /** Set for LoCoMo / MemoryAgentBench / Mem2Act. */
  sample_id?: string;
  /** Set for LoCoMo (1-5) or MemoryAgentBench (AR/TTL/LRU/CR) or Mem2Act split. */
  category?: number | string;
  question: string;
  gold_answer: string;
  predicted_answer: string;
  /** 1 = correct, 0 = wrong, 0.5 = partial (LME spec). null = not scored. */
  score: number | null;
  judge_reason?: string;
  sessions_fed: number;
  conversation_ids: string[];
  duration_ms: number;
  error?: string;
  /** Mem2Act only — gold + observed tool calls and scoring breakdown. */
  tool_calls?: {
    gold: Mem2ActGoldCall[];
    observed: Mem2ActToolCallObserved[];
    precision: number;
    recall: number;
    f1: number;
    mode: 'strict' | 'unordered' | 'permissive';
  };
}

export type BenchmarkName =
  | 'LongMemEval'
  | 'LoCoMo'
  | 'MemoryAgentBench'
  | 'Mem2Act'
  | 'MemGround';

export interface RunState {
  run_id: string;
  benchmark: BenchmarkName;
  started_at: string;
  completed: Record<string, QuestionResult>;
  /** Set while a question is in flight so a crash can clean up its imports. */
  in_flight?: {
    question_id: string;
    conversation_ids: string[];
    agent_id: string;
    started_at: string;
  };
  /** Per-sample bookkeeping (LoCoMo). */
  samples?: Record<
    string,
    {
      conversation_ids: string[];
      sessions_fed: number;
      agent_id: string;
      started_at: string;
    }
  >;
}

export interface RunSummary {
  timestamp: string;
  benchmark: string;
  extraction_method: string;
  feed_mode: string;
  total_questions: number;
  correct: number;
  partial: number;
  accuracy: number;
  category_scores: Record<string, { correct: number; partial: number; total: number }>;
  results: QuestionResult[];
}
