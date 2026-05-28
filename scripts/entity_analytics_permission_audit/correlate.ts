/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Persona,
  PersonaBrowserResult,
  AuditResult,
  AuditStatus,
  CorrelationEntry,
  ObservedState,
  PrivilegeField,
  FlyoutCheckResult,
} from './types';

const resolveApiValue = (
  personaResult: PersonaBrowserResult,
  endpoint: string,
  field: PrivilegeField
): boolean | null => {
  const r = personaResult.apiResults.find((a) => a.endpointId === endpoint);
  if (!r?.response) return null;
  return r.response[field] ?? null;
};

const resolveApiError = (
  personaResult: PersonaBrowserResult,
  endpoint: string
): string | undefined => {
  return personaResult.apiResults.find((a) => a.endpointId === endpoint)?.error;
};

const computeStatus = (
  apiValue: boolean | null,
  browserObserved: ObservedState | null,
  apiError: string | undefined
): AuditStatus => {
  if (apiError || apiValue === null) return 'ERROR';
  // 'skipped' means no DOM selectors are defined for this feature gate
  if (browserObserved === 'skipped' || browserObserved === null) return 'API_ONLY';
  // 'error' means one or more DOM assertions failed
  if (browserObserved === 'error') return 'FAIL';
  return 'PASS';
};

/** Flatten flyout checks across all personas into a single array with persona attached. */
export const collectFlyoutResults = (
  personas: Persona[],
  browserResults: PersonaBrowserResult[]
): Array<{ persona: Persona; check: FlyoutCheckResult }> => {
  const resultIndex = new Map(browserResults.map((r) => [r.personaId, r]));
  const rows: Array<{ persona: Persona; check: FlyoutCheckResult }> = [];
  for (const persona of personas) {
    const pr = resultIndex.get(persona.id);
    if (!pr) continue;
    for (const check of pr.flyoutChecks) {
      rows.push({ persona, check });
    }
  }
  return rows;
};

export const correlate = (
  personas: Persona[],
  correlationMap: CorrelationEntry[],
  browserResults: PersonaBrowserResult[]
): AuditResult[] => {
  const results: AuditResult[] = [];
  const resultIndex = new Map(browserResults.map((r) => [r.personaId, r]));

  for (const persona of personas) {
    const personaResult = resultIndex.get(persona.id);
    if (!personaResult) continue;

    const browserCheckIndex = new Map(personaResult.browserChecks.map((c) => [c.featureName, c]));

    for (const entry of correlationMap) {
      const apiValue = resolveApiValue(personaResult, entry.endpoint, entry.privilegeField);
      const apiError = resolveApiError(personaResult, entry.endpoint);
      const browserCheck = browserCheckIndex.get(entry.featureName) ?? null;
      const browserObserved: ObservedState | null = browserCheck?.observed ?? null;

      results.push({
        persona,
        featureName: entry.featureName,
        page: entry.page,
        endpoint: entry.endpoint,
        privilegeField: entry.privilegeField,
        apiValue,
        browserObserved,
        expectedWhenDenied: entry.expectedWhenDenied,
        status: computeStatus(apiValue, browserObserved, apiError),
        details: apiError ?? browserCheck?.details,
      });
    }
  }

  return results;
};
