/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const STORAGE_KEY = 'kibana.esql.fastMode';

/**
 * Persists the user's Fast mode (ES|QL approximation) preference across browser sessions.
 *
 * Consumers should read from this storage during initialization to seed their default state,
 * and write to it whenever the user toggles Fast mode. The write is centralized in
 * `EsqlApproximationToggle`, so individual consumers only need to call `get()` on init.
 */
export const esqlApproximationStorage = {
  /**
   * Returns the stored Fast mode preference, or `undefined` if the user has never toggled it.
   */
  get(): boolean | undefined {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw !== null ? raw === 'true' : undefined;
  },
  /**
   * Persists the Fast mode preference so it survives page reloads and new browser sessions.
   */
  set(value: boolean) {
    localStorage.setItem(STORAGE_KEY, String(value));
  },
};
