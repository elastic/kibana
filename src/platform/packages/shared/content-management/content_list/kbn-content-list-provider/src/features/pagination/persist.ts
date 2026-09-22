/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const STORAGE_PREFIX = 'contentList:pageSize:';

/**
 * Read persisted page size from `localStorage`, falling back to the configured default.
 *
 * @param key - Unique key for the content list (typically `queryKeyScope`).
 * @param fallback - Default page size when no persisted value exists.
 * @returns The persisted page size, or `fallback` if none is found.
 */
export const getPersistedPageSize = (key: string, fallback: number): number => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch {
    // localStorage may be unavailable (e.g. private browsing, SSR).
  }
  return fallback;
};

/**
 * Write page size to `localStorage`.
 *
 * @param key - Unique key for the content list (typically `queryKeyScope`).
 * @param size - Page size to persist.
 */
export const setPersistedPageSize = (key: string, size: number): void => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(size));
  } catch {
    // localStorage may be unavailable (e.g. private browsing, SSR).
  }
};
