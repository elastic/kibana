/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';

export const trimTrailingStar = (str: string) => str.replace(/\*$/, '');

export const validatePathParameters = (pathParameters: string[], schemaKeys: string[]) => {
  if (pathParameters.length !== schemaKeys.length) {
    throw new Error(
      `Schema expects [${schemaKeys.join(', ')}], but path contains [${pathParameters.join(', ')}]`
    );
  }

  for (let pathParameter of pathParameters) {
    pathParameter = trimTrailingStar(pathParameter);
    if (!schemaKeys.includes(pathParameter)) {
      throw new Error(
        `Path expects key "${pathParameter}" from schema but it was not found. Existing schema keys are: ${schemaKeys.join(
          ', '
        )}`
      );
    }
  }
};

export const isReferenceObject = (schema: unknown): schema is OpenAPIV3.ReferenceObject => {
  return typeof schema === 'object' && schema !== null && '$ref' in (schema as object);
};

/**
 * Detects the \"void\" JSON Schema used for routes which explicitly model
 * the absence of a request body as `z.undefined()`. In those cases we want
 * to omit `requestBody` from the OpenAPI operation entirely instead of
 * surfacing a `{ not: {} }` schema.
 */
export const isVoidRequestBodySchema = (schema: OpenAPIV3.SchemaObject | undefined): boolean => {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  const keys = Object.keys(schema);
  if (keys.length !== 1 || keys[0] !== 'not') {
    return false;
  }

  const not = (schema as any).not;
  return Boolean(not && typeof not === 'object' && Object.keys(not as object).length === 0);
};
