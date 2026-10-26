/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Adapters, Request } from '@kbn/inspector-plugin/public';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * True when an inspector request is the body logged by the ES|QL expression.
 * SQL also logs a string `query`, but only ES|QL sets `include_execution_metadata`.
 */
export function isEsqlInspectorRequest(request: Request): boolean {
  const json = request.json;
  return (
    isRecord(json) && typeof json.query === 'string' && json.include_execution_metadata === true
  );
}

/** ES|QL requests on an inspector adapter, in the order they were logged. */
export function listEsqlInspectorRequests(adapters: Adapters): Request[] {
  return adapters.requests?.getRequests().filter(isEsqlInspectorRequest) ?? [];
}

/** Inspector views use this to appear only when an ES|QL request was logged. */
export function hasEsqlInspectorRequest(adapters: Adapters): boolean {
  return listEsqlInspectorRequests(adapters).length > 0;
}
