/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from '../type';

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
