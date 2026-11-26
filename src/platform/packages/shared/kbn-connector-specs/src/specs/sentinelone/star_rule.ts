/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Fields of a STAR rule that the full-replace PUT accepts under `data` (API reference v2.1). */
export const STAR_RULE_DATA_FIELDS: readonly string[] = [
  'name',
  'description',
  'severity',
  'expirationMode',
  'expiration',
  'queryType',
  's1ql',
  'status',
  'networkQuarantine',
  'treatAsThreat',
  'queryLang',
  'correlationParams',
  'scheduledParams',
  'uebaParams',
  'coolOffSettings',
  'hideLogic',
  'entityMappings',
  'templateRuleId',
  'exclusionIds',
];

export type StarRule = Record<string, unknown> & {
  id?: string;
  scope?: string;
  /** An array in the API reference (v2.1); a single string is accepted too. */
  scopeId?: string | string[] | null;
  accountId?: string;
  siteId?: string;
};

/** Copies every PUT-accepted field of the current rule, then overlays the requested changes. */
export const mergeStarRule = (
  current: StarRule,
  changes: Record<string, unknown>
): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  for (const field of STAR_RULE_DATA_FIELDS) {
    if (current[field] !== undefined && current[field] !== null) data[field] = current[field];
  }
  for (const [field, value] of Object.entries(changes)) {
    if (value !== undefined) data[field] = value;
  }
  return data;
};

/** Rebuilds the rule's scope filter from the GET response so an update never moves the rule. */
export const starRuleScopeFilter = (rule: StarRule): Record<string, unknown> => {
  const scope = String(rule.scope ?? '').toLowerCase();
  if (scope === 'tenant' || scope === 'global') return { tenant: true };
  const raw = rule.scopeId;
  const scopeIds = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String).filter(Boolean);
  const pick = (fallback?: string): string[] =>
    scopeIds.length > 0 ? scopeIds : fallback ? [fallback] : [];
  const accountIds = scope === 'account' ? pick(rule.accountId) : [];
  if (accountIds.length > 0) return { accountIds };
  const siteIds = scope === 'site' ? pick(rule.siteId) : [];
  if (siteIds.length > 0) return { siteIds };
  const groupIds = scope === 'group' ? pick() : [];
  if (groupIds.length > 0) return { groupIds };
  throw new Error(
    `updateStarRule: cannot determine the scope of rule [${rule.id}] (scope=${
      rule.scope ?? 'missing'
    }); the rule was not changed`
  );
};
