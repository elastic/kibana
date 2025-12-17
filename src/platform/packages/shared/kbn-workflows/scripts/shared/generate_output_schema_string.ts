/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { getSchemaNamePrefix } from './get_schema_name_prefix';
import { getOrResolveObject } from '../../common/utils';

export function generateOutputSchemaString(
  operations: OpenAPIV3.OperationObject[],
  openApiDocument: OpenAPIV3.Document
): string {
  const operationsWithNonEmptyResponseSchemas = operations.filter((operation) => {
    if (!operation.responses?.[200]) {
      return false;
    }
    const response = getOrResolveObject<OpenAPIV3.ResponseObject>(
      operation.responses?.[200],
      openApiDocument
    );
    return (
      response &&
      response.content &&
      response.content['application/json']?.schema !== undefined &&
      Object.keys(response.content['application/json'].schema ?? {}).length > 0
    );
  });
  // TODO: add error schema
  return generateSuccessSchemaString(
    operationsWithNonEmptyResponseSchemas.map((operation) => operation.operationId ?? '')
  );
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
