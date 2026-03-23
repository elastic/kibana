/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';

// In order to generate valid zod schemas, we need to remove discriminators from the all components/schemas
// if their mapping doesn't have the same number of items as the oneOf array
// https://github.com/hey-api/openapi-ts/issues/3020
export function removeDiscriminatorsWithInvalidMapping(document: OpenAPIV3.Document) {
  if (!document.components || !document.components.schemas) {
    return document;
  }
  document.components.schemas = Object.fromEntries(
    Object.entries(document.components.schemas).map(([key, value]) => {
      if ('$ref' in value) {
        return [key, value];
      }
      if (value.discriminator && Object.keys(value.discriminator.mapping ?? {}).length > 0) {
        if (value.oneOf) {
          const oneOfCount = value.oneOf.length;
          const mappingCount = Object.keys(value.discriminator.mapping ?? {}).length;
          if (oneOfCount !== mappingCount) {
            console.warn(
              `Discriminator ${key} has invalid mapping: mapping has ${mappingCount} items, but oneOf has ${oneOfCount} items, removing it`
            );
            delete value.discriminator;
          }
        }
      }
      return [key, value];
    })
  );
  return document;
}
