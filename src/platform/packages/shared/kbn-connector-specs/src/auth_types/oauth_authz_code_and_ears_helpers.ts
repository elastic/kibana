/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * OAuth token responses often use `token_type: "bearer"` (lowercase). If the stored header begins
 * with `bearer ` (after trim), rewrites the scheme to `Bearer `; otherwise returns the trimmed value.
 */
export function normalizeAuthorizationHeaderValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('bearer ')) {
    return `Bearer ${trimmed.slice('bearer '.length)}`;
  }
  return trimmed;
}
