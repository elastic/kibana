/**
 * Deterministic Mem2ActBench scorer — compares the agent's chosen tool calls
 * (parsed from `converse` → `steps[]`) against the gold list.
 *
 * Three scoring modes:
 *  - `strict`: tool ids match in order AND params deep-equal.
 *  - `unordered`: same multiset of (tool_id, params), order doesn't matter.
 *  - `permissive`: tool ids match in order; params are checked only for the
 *    keys present in the gold call (extras are ignored).
 */

import type {
  ConverseResponse,
  Mem2ActGoldCall,
  Mem2ActToolCallObserved,
} from './types.js';

export type Mem2ActScoreMode = 'strict' | 'unordered' | 'permissive';

export interface Mem2ActScoreInput {
  observed: Mem2ActToolCallObserved[];
  gold: Mem2ActGoldCall[];
  mode?: Mem2ActScoreMode;
  /**
   * If true, the runner accepts a namespaced tool_id when the gold tool_id is
   * un-prefixed. E.g. observed `mem2act.add_event` matches gold `add_event`.
   */
  matchTrailingName?: boolean;
}

export interface Mem2ActScoreDetail {
  gold: Mem2ActGoldCall;
  observed?: Mem2ActToolCallObserved;
  match: 'exact' | 'name' | 'missing';
  paramDiffs?: string[];
}

export interface Mem2ActScoreResult {
  score: 0 | 1 | number;
  mode: Mem2ActScoreMode;
  tool_match: number;
  param_match: number;
  precision: number;
  recall: number;
  f1: number;
  extra_calls: Mem2ActToolCallObserved[];
  details: Mem2ActScoreDetail[];
}

const toolIdsEqual = (
  observed: string,
  gold: string,
  matchTrailingName: boolean | undefined
): boolean => {
  if (observed === gold) return true;
  if (!matchTrailingName) return false;
  const trailing = (id: string) => id.split('.').pop() ?? id;
  return trailing(observed) === gold || observed === trailing(gold) || trailing(observed) === trailing(gold);
};

const stableStringify = (val: unknown): string => {
  if (val === null || val === undefined) return JSON.stringify(val);
  if (Array.isArray(val)) return `[${val.map(stableStringify).join(',')}]`;
  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((val as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(val);
};

const deepEqual = (a: unknown, b: unknown): boolean => stableStringify(a) === stableStringify(b);

const paramsMatchExact = (
  observed: Record<string, unknown> | undefined,
  gold: Record<string, unknown> | undefined
): { ok: boolean; diffs: string[] } => {
  const oKeys = Object.keys(observed ?? {}).sort();
  const gKeys = Object.keys(gold ?? {}).sort();
  const diffs: string[] = [];
  if (oKeys.length !== gKeys.length || oKeys.some((k, i) => k !== gKeys[i])) {
    diffs.push(`keys: observed=${oKeys.join(',') || '-'} gold=${gKeys.join(',') || '-'}`);
    return { ok: false, diffs };
  }
  for (const k of gKeys) {
    if (!deepEqual((observed ?? {})[k], (gold ?? {})[k])) {
      diffs.push(`param "${k}" differs`);
    }
  }
  return { ok: diffs.length === 0, diffs };
};

const paramsMatchPermissive = (
  observed: Record<string, unknown> | undefined,
  gold: Record<string, unknown> | undefined
): { ok: boolean; diffs: string[] } => {
  const diffs: string[] = [];
  const goldKeys = Object.keys(gold ?? {});
  for (const k of goldKeys) {
    if (!deepEqual((observed ?? {})[k], (gold ?? {})[k])) {
      diffs.push(`param "${k}" differs`);
    }
  }
  return { ok: diffs.length === 0, diffs };
};

export const scoreMem2Act = (input: Mem2ActScoreInput): Mem2ActScoreResult => {
  const mode = input.mode ?? 'permissive';
  const trailing = input.matchTrailingName ?? true;
  const details: Mem2ActScoreDetail[] = [];

  const observed = [...input.observed];
  let toolMatchCount = 0;
  let paramMatchCount = 0;

  const score = (
    obs: Mem2ActToolCallObserved | undefined,
    gold: Mem2ActGoldCall
  ): Mem2ActScoreDetail => {
    if (!obs) return { gold, match: 'missing' };
    if (!toolIdsEqual(obs.tool_id, gold.tool_id, trailing)) {
      return { gold, observed: obs, match: 'missing' };
    }
    toolMatchCount += 1;
    const matcher = mode === 'permissive' ? paramsMatchPermissive : paramsMatchExact;
    const { ok, diffs } = matcher(obs.params, gold.params);
    if (ok) paramMatchCount += 1;
    return {
      gold,
      observed: obs,
      match: ok ? 'exact' : 'name',
      paramDiffs: diffs.length > 0 ? diffs : undefined,
    } as Mem2ActScoreDetail;
  };

  if (mode === 'unordered') {
    const consumed = new Set<number>();
    for (const gold of input.gold) {
      let pick: { idx: number; detail: Mem2ActScoreDetail } | undefined;
      for (let i = 0; i < observed.length; i++) {
        if (consumed.has(i)) continue;
        const obs = observed[i]!;
        if (!toolIdsEqual(obs.tool_id, gold.tool_id, trailing)) continue;
        const matcher = mode === 'unordered' ? paramsMatchExact : paramsMatchExact;
        const { ok, diffs } = matcher(obs.params, gold.params);
        if (ok) {
          pick = {
            idx: i,
            detail: { gold, observed: obs, match: 'exact' },
          };
          break;
        }
        if (!pick) {
          pick = { idx: i, detail: { gold, observed: obs, match: 'name', paramDiffs: diffs } };
        }
      }
      if (pick) {
        consumed.add(pick.idx);
        details.push(pick.detail);
        if (pick.detail.match !== 'missing') toolMatchCount += 1;
        if (pick.detail.match === 'exact') paramMatchCount += 1;
      } else {
        details.push({ gold, match: 'missing' });
      }
    }
    const extra: Mem2ActToolCallObserved[] = observed.filter((_, i) => !consumed.has(i));
    return finalize(details, toolMatchCount, paramMatchCount, extra, input.gold.length, observed.length, mode);
  }

  // strict / permissive: walk gold in order, pop observed from a queue.
  const queue = [...observed];
  for (const gold of input.gold) {
    const obs = queue.shift();
    details.push(score(obs, gold));
  }
  return finalize(details, toolMatchCount, paramMatchCount, queue, input.gold.length, observed.length, mode);
};

const finalize = (
  details: Mem2ActScoreDetail[],
  toolMatch: number,
  paramMatch: number,
  extra: Mem2ActToolCallObserved[],
  goldCount: number,
  observedCount: number,
  mode: Mem2ActScoreMode
): Mem2ActScoreResult => {
  const precision = observedCount === 0 ? 0 : paramMatch / observedCount;
  const recall = goldCount === 0 ? 0 : paramMatch / goldCount;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const allExact = goldCount > 0 && paramMatch === goldCount && extra.length === 0;
  return {
    score: allExact ? 1 : 0,
    mode,
    tool_match: toolMatch,
    param_match: paramMatch,
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    extra_calls: extra,
    details,
  };
};

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/**
 * Walk a ConverseResponse `steps[]` array and collect every `tool_call` step
 * in the order they were emitted. Resilient to step shape changes — we look
 * for either `type === "tool_call"` or the presence of `tool_id` + `params`.
 */
export const extractToolCalls = (response: ConverseResponse): Mem2ActToolCallObserved[] => {
  const out: Mem2ActToolCallObserved[] = [];
  const steps = Array.isArray(response.steps) ? response.steps : [];
  for (const stepRaw of steps) {
    if (!stepRaw || typeof stepRaw !== 'object') continue;
    const step = stepRaw as Record<string, unknown>;
    const type = step.type;
    const isToolCall =
      type === 'tool_call' || (typeof step.tool_id === 'string' && step.params !== undefined);
    if (!isToolCall) continue;
    const toolId = typeof step.tool_id === 'string' ? step.tool_id : undefined;
    if (!toolId) continue;
    const params =
      step.params && typeof step.params === 'object'
        ? (step.params as Record<string, unknown>)
        : {};
    const observed: Mem2ActToolCallObserved = { tool_id: toolId, params };
    if (typeof step.tool_call_id === 'string') observed.tool_call_id = step.tool_call_id;
    out.push(observed);
  }
  return out;
};
