/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const STORAGE_KEY_PREFIX = 'contentList:';

/**
 * Read a raw string from `localStorage`.
 * @param key - Key within the content list namespace (stored as `contentList:<key>`).
 * @returns The stored string, or `null` when missing or when storage is unavailable.
 */
export const readLocalStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
  } catch {
    // localStorage may be unavailable (e.g. private browsing, SSR).
    return null;
  }
};

/** Write a raw string to `localStorage`, ignoring failures when storage is unavailable. */
export const writeLocalStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, value);
  } catch {
    // localStorage may be unavailable (e.g. private browsing, SSR).
  }
};
