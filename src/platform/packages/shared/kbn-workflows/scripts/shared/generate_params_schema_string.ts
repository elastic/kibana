/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSchemaNamePrefix } from './get_schema_name_prefix';

// Utils used in the generated code, should be imported relative to @kbn/workflows/spec/elasticsearch/generated/ or @kbn/workflows/spec/kibana/generated/
export const StaticImports = `
import { getShapeAt } from '../../../common/utils/zod';
`;

// TODO: unwrap and combine the shapes at the build time instead of at the runtime
// Union is important because if we use object we override parameters from "body", "path", "query" with the same name with the latest one
// "body" goes last: when a key is in both "body" and "query" (e.g. `_source`), the request builder sends it in the body,
// so the body type must win.
export function generateParamsSchemaString(
  operationIds: string[],
  extendParams: Record<string, string>,
  spreadParams: string[] = []
): string {
  const extendParamsString = [
    ...Object.entries(extendParams).map(([key, value]) => `${key}: ${value}`),
    ...spreadParams.map((s) => `...${s}`),
  ].join(', ');
  if (operationIds.length === 0) {
    return `z.optional(z.object({ ${extendParamsString} }))`;
  }

  if (operationIds.length === 1) {
    return `z.object({
      ...getShapeAt(${getRequestSchemaName(operationIds[0])}, 'query'),
      ...getShapeAt(${getRequestSchemaName(operationIds[0])}, 'path'),
      ...getShapeAt(${getRequestSchemaName(operationIds[0])}, 'body'),
      ${extendParamsString}
    })`;
  }

  return `z.union([${operationIds
    .map(
      (operationId) => `z.object({
      ...getShapeAt(${getRequestSchemaName(operationId)}, 'query'),
      ...getShapeAt(${getRequestSchemaName(operationId)}, 'path'),
      ...getShapeAt(${getRequestSchemaName(operationId)}, 'body'),
      ${extendParamsString}
    })`
    )
    .join(', ')}])`;
}

export function getRequestSchemaName(operationId: string): string {
  return `${getSchemaNamePrefix(operationId)}_request`;
}
