/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SelectionOption } from '@kbn/workflows/types/v1';

const resolvedEntityCache = new Map<string, { option: SelectionOption; timestamp: number }>();
const searchOptionsCache = new Map<string, SelectionOption[]>();
// The cache purpose is to reduce the number of server requests during heavy UI editing.
// However, long TTL has a bad impact on UX, showing stale data should be avoided.
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

function getCacheKey(stepType: string, scope: string, propertyKey: string, value: unknown): string {
  return `${stepType}:${scope}:${propertyKey}:${String(value)}`;
}

function getSearchCacheKey(stepType: string, scope: string, propertyKey: string): string {
  return `${stepType}:${scope}:${propertyKey}:search`;
}

export function getCachedOption(key: string): SelectionOption | null {
  const cached = resolvedEntityCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.option;
  }
  if (cached) {
    resolvedEntityCache.delete(key);
  }
  return null;
}

export function setCachedOption(key: string, option: SelectionOption): void {
  resolvedEntityCache.set(key, { option, timestamp: Date.now() });
}

export function cacheSearchOptions(
  stepType: string,
  scope: string,
  propertyKey: string,
  options: SelectionOption[]
): void {
  const cacheKey = getSearchCacheKey(stepType, scope, propertyKey);
  searchOptionsCache.set(cacheKey, options);
  for (const option of options) {
    const valueKey = getCacheKey(stepType, scope, propertyKey, option.value);
    setCachedOption(valueKey, option);
  }
}

export function getCachedSearchOption(
  stepType: string,
  scope: string,
  propertyKey: string,
  value: unknown
): SelectionOption | null {
  const cacheKey = getSearchCacheKey(stepType, scope, propertyKey);
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

export function getCacheKeyForValue(
  stepType: string,
  scope: string,
  propertyKey: string,
  value: unknown
): string {
  return getCacheKey(stepType, scope, propertyKey, value);
}

export function clearCache(): void {
  resolvedEntityCache.clear();
  searchOptionsCache.clear();
}
