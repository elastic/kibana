/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSchemaNamePrefix } from './get_schema_name_prefix';

export function generateOutputSchemaString(operationIds: string[]): string {
  // TODO: add error schema
  return generateSuccessSchemaString(operationIds);
}

function generateSuccessSchemaString(operationIds: string[]): string {
  if (operationIds.length === 0) {
    return 'z.optional(z.looseObject({}))';
  }
  if (operationIds.length === 1) {
    return `${getResponseSchemaName(operationIds[0])}`;
  }
  return `z.union([${operationIds
    .map((operationId) => `${getResponseSchemaName(operationId)}`)
    .join(', ')}])`;
}

export function getResponseSchemaName(operationId: string): string {
  return `${getSchemaNamePrefix(operationId)}_response`;
}
