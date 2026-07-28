/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable */

// Cross-file helpers used by test.js to exercise interprocedural + cross-file value
// flow — the cases the ESLint rule cannot see.

// Unsafe: returns a path with an unencoded, interpolated segment.
export const makeUnsafeDeletePath = (id: string): string => `/api/things/${id}`;

// Safe: encodes the segment before returning.
export const makeSafeDeletePath = (id: string): string =>
  `/api/things/${encodeURIComponent(id)}`;
