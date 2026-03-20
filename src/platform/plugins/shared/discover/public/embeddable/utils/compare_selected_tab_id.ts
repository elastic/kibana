/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Compares two selectedTabId values, treating `undefined` as equivalent to the
 * first (default) tab. This prevents false "unsaved changes" when the stored
 * panel state omits selectedTabId and deserialization resolves it to the default.
 */
export const compareSelectedTabId = (
  defaultTabId: string | undefined,
  last: string | undefined,
  current: string | undefined
): boolean => (last ?? defaultTabId) === (current ?? defaultTabId);
