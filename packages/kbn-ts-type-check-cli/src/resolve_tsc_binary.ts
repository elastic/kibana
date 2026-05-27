/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Resolves the absolute path to the `tsc` binary the type-check pipeline should
 * spawn. Defaults to the workspace-pinned `typescript` package; can be pointed
 * at any other installed package (e.g. `typescript-6`) by setting
 * `KBN_TS_COMPILER_PACKAGE`.
 *
 * Used by the TS 6.0 canary CI lane so the existing orchestration can be
 * exercised against a non-default compiler without code changes elsewhere.
 */
export const resolveTscBinary = (): string => {
  const pkg = process.env.KBN_TS_COMPILER_PACKAGE || 'typescript';
  return require.resolve(`${pkg}/bin/tsc`);
};
