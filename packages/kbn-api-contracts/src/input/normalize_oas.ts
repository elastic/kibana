/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPISpec } from './load_oas';

export interface NormalizedOperation {
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
}

export interface NormalizedSpec {
  paths: Record<string, Record<string, NormalizedOperation>>;
}

function sortObjectKeys<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => [
        key,
        value && typeof value === 'object' && !Array.isArray(value)
          ? sortObjectKeys(value as Record<string, any>)
          : value,
      ])
  ) as T;
}

export function normalizeOas(spec: OpenAPISpec): NormalizedSpec {
  const normalized: NormalizedSpec = { paths: {} };

  if (!spec.paths) {
    return normalized;
  }

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    normalized.paths[path] = {};

    for (const [method, operation] of Object.entries(pathItem)) {
      if (typeof operation !== 'object' || operation === null) {
        continue;
      }

      const op = operation as Record<string, unknown>;
      const normalizedOp: NormalizedOperation = {};

      if (op.parameters) {
        normalizedOp.parameters = op.parameters as unknown[];
      }

      if (op.requestBody) {
        normalizedOp.requestBody = op.requestBody;
      }

      if (op.responses) {
        normalizedOp.responses = op.responses as Record<string, unknown>;
      }

      normalized.paths[path][method] = normalizedOp;
    }
  }

  return sortObjectKeys(normalized);
}
