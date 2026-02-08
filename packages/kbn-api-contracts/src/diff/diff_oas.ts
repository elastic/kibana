/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NormalizedSpec } from '../input/normalize_oas';

export type DiffType = 'added' | 'removed' | 'modified';

export interface PathDiff {
  type: DiffType;
  path: string;
}

export interface MethodDiff {
  type: DiffType;
  path: string;
  method: string;
}

export interface OperationDiff {
  path: string;
  method: string;
  changes: OperationChange[];
}

export interface OperationChange {
  type: 'parameters' | 'requestBody' | 'responses';
  change: 'added' | 'removed' | 'modified';
  details?: unknown;
}

export interface OasDiff {
  pathsAdded: PathDiff[];
  pathsRemoved: PathDiff[];
  methodsAdded: MethodDiff[];
  methodsRemoved: MethodDiff[];
  operationsModified: OperationDiff[];
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  const aArray = Array.isArray(a);
  const bArray = Array.isArray(b);
  if (aArray !== bArray) return false;

  if (aArray && bArray) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!bKeys.includes(key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }

  return true;
}

export function diffOas(baseline: NormalizedSpec, current: NormalizedSpec): OasDiff {
  const diff: OasDiff = {
    pathsAdded: [],
    pathsRemoved: [],
    methodsAdded: [],
    methodsRemoved: [],
    operationsModified: [],
  };

  const baselinePaths = new Set(Object.keys(baseline.paths));
  const currentPaths = new Set(Object.keys(current.paths));

  for (const path of currentPaths) {
    if (!baselinePaths.has(path)) {
      diff.pathsAdded.push({ type: 'added', path });
    }
  }

  for (const path of baselinePaths) {
    if (!currentPaths.has(path)) {
      diff.pathsRemoved.push({ type: 'removed', path });
      continue;
    }

    const baselineMethods = baseline.paths[path];
    const currentMethods = current.paths[path];

    const baselineMethodKeys = new Set(Object.keys(baselineMethods));
    const currentMethodKeys = new Set(Object.keys(currentMethods));

    for (const method of currentMethodKeys) {
      if (!baselineMethodKeys.has(method)) {
        diff.methodsAdded.push({ type: 'added', path, method });
      }
    }

    for (const method of baselineMethodKeys) {
      if (!currentMethodKeys.has(method)) {
        diff.methodsRemoved.push({ type: 'removed', path, method });
        continue;
      }

      const baselineOp = baselineMethods[method];
      const currentOp = currentMethods[method];

      const changes: OperationChange[] = [];

      if (!deepEqual(baselineOp.parameters, currentOp.parameters)) {
        const hasBaseline = baselineOp.parameters !== undefined;
        const hasCurrent = currentOp.parameters !== undefined;
        const change = !hasBaseline ? 'added' : !hasCurrent ? 'removed' : 'modified';
        changes.push({ type: 'parameters', change, details: currentOp.parameters });
      }

      if (!deepEqual(baselineOp.requestBody, currentOp.requestBody)) {
        const hasBaseline = baselineOp.requestBody !== undefined;
        const hasCurrent = currentOp.requestBody !== undefined;
        const change = !hasBaseline ? 'added' : !hasCurrent ? 'removed' : 'modified';
        changes.push({ type: 'requestBody', change, details: currentOp.requestBody });
      }

      if (!deepEqual(baselineOp.responses, currentOp.responses)) {
        const hasBaseline = baselineOp.responses !== undefined;
        const hasCurrent = currentOp.responses !== undefined;
        const change = !hasBaseline ? 'added' : !hasCurrent ? 'removed' : 'modified';
        changes.push({ type: 'responses', change, details: currentOp.responses });
      }

      if (changes.length > 0) {
        diff.operationsModified.push({ path, method, changes });
      }
    }
  }

  return diff;
}
