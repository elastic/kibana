/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { safeJsonStringify } from '@kbn/std';
import type {
  SelectionDetails,
  SelectionOption,
  StepSelectionValues,
} from '@kbn/workflows/types/v1';
import type { CustomPropertyItem } from '../../features/validate_workflow_yaml/model/types';

const searchOptionsCache = new Map<string, SelectionOption[]>();

const validationOutcomeCache = new Map<
  string,
  { timestamp: number; resolvedOption: SelectionOption | null; details: SelectionDetails }
>();

// The cache purpose is to reduce the number of server requests during heavy UI editing.
// However, long TTL has a bad impact on UX, showing stale data should be avoided.
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

function getFingerprintFromValues(values?: StepSelectionValues): string | undefined {
  if (!values) {
    return undefined;
  }
  const hasConfig = Object.keys(values.config).length > 0;
  const hasInput = Object.keys(values.input).length > 0;
  if (!hasConfig && !hasInput) {
    return undefined;
  }
  return safeJsonStringify(values);
}

function getSearchCacheKey(
  stepType: string,
  scope: string,
  propertyKey: string,
  values?: StepSelectionValues
): string {
  const fingerprint = getFingerprintFromValues(values);
  if (fingerprint) {
    return `${stepType}:${scope}:${propertyKey}:search:${fingerprint}`;
  }
  return `${stepType}:${scope}:${propertyKey}:search`;
}

export function cacheSearchOptions(
  stepType: string,
  scope: string,
  propertyKey: string,
  options: SelectionOption[],
  values?: StepSelectionValues
): void {
  const cacheKey = getSearchCacheKey(stepType, scope, propertyKey, values);
  searchOptionsCache.set(cacheKey, options);
}

export function getCachedSearchOption(
  stepType: string,
  scope: string,
  propertyKey: string,
  value: unknown,
  values?: StepSelectionValues
): SelectionOption | null {
  const cacheKey = getSearchCacheKey(stepType, scope, propertyKey, values);
  const cachedOptions = searchOptionsCache.get(cacheKey);
  if (cachedOptions) {
    const matchingOption = cachedOptions.find(
      (opt) => String(opt.value) === String(value) || opt.value === value
    );
    if (matchingOption) {
      return matchingOption;
    }
  }
  return null;
}

function stableSerializePropertyValue(value: unknown): string {
  return safeJsonStringify(value) ?? String(value);
}

export function getCustomPropertyValidationOutcomeCacheKey(item: CustomPropertyItem): string {
  const { stepType, scope, propertyKey, values } = item.context;
  const fp = getFingerprintFromValues(values) ?? '';
  const valueKey = stableSerializePropertyValue(item.propertyValue);
  return `${item.stepId}\0${stepType}\0${scope}\0${propertyKey}\0${fp}\0${valueKey}`;
}

export function getCachedCustomPropertyValidationOutcome(
  key: string
): { resolvedOption: SelectionOption | null; details: SelectionDetails } | null {
  const cached = validationOutcomeCache.get(key);
  if (!cached) {
    return null;
  }
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    validationOutcomeCache.delete(key);
    return null;
  }
  return { resolvedOption: cached.resolvedOption, details: cached.details };
}

export function setCachedCustomPropertyValidationOutcome(
  key: string,
  resolvedOption: SelectionOption | null,
  details: SelectionDetails
): void {
  validationOutcomeCache.set(key, { timestamp: Date.now(), resolvedOption, details });
}

export function clearCustomPropertyValidationOutcomeCache(): void {
  validationOutcomeCache.clear();
}

export function clearCache(): void {
  searchOptionsCache.clear();
  validationOutcomeCache.clear();
}
