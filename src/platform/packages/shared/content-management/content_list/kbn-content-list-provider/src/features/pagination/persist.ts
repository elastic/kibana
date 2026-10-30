/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readLocalStorage, writeLocalStorage } from '../../storage/local_storage';

const STORAGE_KEY_PREFIX_PAGE_SIZE = 'pageSize:';

/**
 * Read persisted page size from `localStorage`, falling back to the configured default.
 *
 * @param key - Unique key for the content list (typically `queryKeyScope`).
 * @param fallback - Default page size when no persisted value exists.
 * @returns The persisted page size, or `fallback` if none is found.
 */
export const getPersistedPageSize = (key: string, fallback: number): number => {
  const raw = readLocalStorage(`${STORAGE_KEY_PREFIX_PAGE_SIZE}${key}`);
  if (raw === null) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Write page size to `localStorage`.
 *
 * @param key - Unique key for the content list (typically `queryKeyScope`).
 * @param size - Page size to persist.
 */
export const setPersistedPageSize = (key: string, size: number): void => {
  writeLocalStorage(`${STORAGE_KEY_PREFIX_PAGE_SIZE}${key}`, String(size));
};
