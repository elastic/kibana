/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Returns the 0-based character index in `query` where the alert "condition"
 * segment begins: the leading `|` of the first top-level `| WHERE …` pipeline stage.
 * If no such clause exists, returns `null` (entire query is treated as base only).
 *
 * Users can move text across the boundary by editing the query (e.g. adding or
 * removing `| WHERE`); highlights update on every change.
 */
export function findEsqlConditionStartOffset(query: string): number | null {
  const re = /\|\s*WHERE\b/i;
  const match = re.exec(query);
  if (!match) {
    return null;
  }
  return match.index;
}

/** Manual CONDITION region from the editor selection (0-based offsets into `query`). */
export type AlertRuleConditionRangeOverride = { start: number; end: number };

export type AlertRuleSplitPlan =
  | { kind: 'all-base' }
  | { kind: 'all-condition' }
  | { kind: 'split'; conditionStartOffset: number }
  | { kind: 'range'; conditionStart: number; conditionEnd: number };

function getAutomaticSplitPlan(query: string): AlertRuleSplitPlan {
  const auto = findEsqlConditionStartOffset(query);
  if (auto === null) {
    return { kind: 'all-base' };
  }
  return { kind: 'split', conditionStartOffset: auto };
}

/**
 * Resolves how to highlight BASE vs CONDITION for the alert-rule editor overlay.
 *
 * @param query — full ES|QL text
 * @param override — `null` uses automatic detection (first top-level `| WHERE …`);
 *   otherwise the selected character range is highlighted as CONDITION (BASE before / after).
 */
export function getAlertRuleSplitPlan(
  query: string,
  override: AlertRuleConditionRangeOverride | null
): AlertRuleSplitPlan {
  const len = query.length;
  if (override !== null) {
    let start = Math.max(0, Math.min(override.start, len));
    let end = Math.max(0, Math.min(override.end, len));
    if (end < start) {
      const t = start;
      start = end;
      end = t;
    }
    if (end === start) {
      return getAutomaticSplitPlan(query);
    }
    if (start === 0 && end === len) {
      return { kind: 'all-condition' };
    }
    return { kind: 'range', conditionStart: start, conditionEnd: end };
  }

  return getAutomaticSplitPlan(query);
}

/**
 * Returns the active CONDITION character interval `[start, end)` for the current plan, or `null`
 * when there is no condition segment (`all-base`).
 */
export function getActiveConditionInterval(
  query: string,
  override: AlertRuleConditionRangeOverride | null
): { start: number; end: number } | null {
  const plan = getAlertRuleSplitPlan(query, override);
  const len = query.length;
  if (plan.kind === 'split') {
    return { start: plan.conditionStartOffset, end: len };
  }
  if (plan.kind === 'range') {
    return { start: plan.conditionStart, end: plan.conditionEnd };
  }
  if (plan.kind === 'all-condition') {
    return { start: 0, end: len };
  }
  return null;
}

/**
 * Text segments for BASE vs CONDITION for the current split plan (clipboard, previews).
 * For `range` plans, BASE is the non-condition prefix and suffix concatenated (no separator).
 */
export function getAlertRuleCopySegments(
  query: string,
  override: AlertRuleConditionRangeOverride | null
): { baseText: string; conditionText: string } {
  const plan = getAlertRuleSplitPlan(query, override);
  const len = query.length;
  if (plan.kind === 'all-base') {
    return { baseText: query, conditionText: '' };
  }
  if (plan.kind === 'all-condition') {
    return { baseText: '', conditionText: query };
  }
  if (plan.kind === 'split') {
    const c0 = plan.conditionStartOffset;
    return {
      baseText: query.slice(0, c0),
      conditionText: query.slice(c0, len),
    };
  }
  const { conditionStart: cs, conditionEnd: ce } = plan;
  return {
    baseText: query.slice(0, cs) + query.slice(ce, len),
    conditionText: query.slice(cs, ce),
  };
}
