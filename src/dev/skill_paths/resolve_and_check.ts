/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: implement

export interface ResolveOptions {
  token: string;
  anchor: 'repo-root' | 'file' | 'declared-base';
  containingFile: string;
  repoRoot: string;
  declaredBase?: string;
}

export interface ResolveResult {
  exists: boolean;
  resolvedPath: string;
}

// Stub — always returns not-found until implemented
export function resolveAndCheck(_options: ResolveOptions): ResolveResult {
  return { exists: false, resolvedPath: '' };
}
