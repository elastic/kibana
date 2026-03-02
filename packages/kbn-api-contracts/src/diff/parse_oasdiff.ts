/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BreakingChange } from './breaking_rules';

export interface OasdiffEntry {
  id: string;
  text: string;
  level: number;
  operation: string;
  path: string;
  source: string;
  operationId?: string;
  component?: string;
}

const PATH_REMOVED_IDS = new Set(['api-path-removed-without-deprecation']);
const METHOD_REMOVED_IDS = new Set([
  'api-removed-without-deprecation',
  'api-removed-before-sunset',
]);

const mapEntryToBreakingChange = ({ id, path, operation, text }: OasdiffEntry): BreakingChange => {
  if (PATH_REMOVED_IDS.has(id)) {
    return { type: 'path_removed', path, method: undefined, reason: text };
  }
  if (METHOD_REMOVED_IDS.has(id)) {
    return { type: 'method_removed', path, method: operation, reason: text };
  }
  return { type: 'operation_breaking', path, method: operation, reason: text };
};

export const parseOasdiff = (entries: OasdiffEntry[]): BreakingChange[] =>
  entries.filter((entry) => entry.level >= 3).map(mapEntryToBreakingChange);
