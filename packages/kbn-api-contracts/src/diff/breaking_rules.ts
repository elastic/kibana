/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OasDiff, OperationChange } from './diff_oas';

export interface BreakingChange {
  type: 'path_removed' | 'method_removed' | 'operation_breaking';
  path: string;
  method?: string;
  reason: string;
  details?: unknown;
}

function isBreakingOperationChange(change: OperationChange): boolean {
  switch (change.change) {
    case 'added':
      return false;
    case 'removed':
      return true;
    case 'modified':
      return ['responses', 'requestBody', 'parameters'].includes(change.type);
    default:
      return false;
  }
}

export function filterBreakingChanges(diff: OasDiff): BreakingChange[] {
  const pathsRemoved = diff.pathsRemoved.map((pathRemoved) => ({
    type: 'path_removed' as const,
    path: pathRemoved.path,
    reason: 'Endpoint removed',
  }));

  const methodsRemoved = diff.methodsRemoved.map((methodRemoved) => ({
    type: 'method_removed' as const,
    path: methodRemoved.path,
    method: methodRemoved.method,
    reason: 'HTTP method removed',
  }));

  const operationBreaking = diff.operationsModified.flatMap((opModified) =>
    opModified.changes.filter(isBreakingOperationChange).map((change) => ({
      type: 'operation_breaking' as const,
      path: opModified.path,
      method: opModified.method,
      reason: `${change.type} ${change.change}`,
      details: change.details,
    }))
  );

  return [...pathsRemoved, ...methodsRemoved, ...operationBreaking];
}
