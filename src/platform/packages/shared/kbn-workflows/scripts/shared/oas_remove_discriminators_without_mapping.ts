/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';

// In order to generate valid zod schemas, we need to remove discriminators from the all components/schemas if they don't have a mapping
// https://github.com/hey-api/openapi-ts/issues/3020
export function removeDiscriminatorsWithoutMapping(document: OpenAPIV3.Document) {
  if (!document.components || !document.components.schemas) {
    return document;
  }
  document.components.schemas = Object.fromEntries(
    Object.entries(document.components.schemas).map(([key, value]) => {
      if ('$ref' in value) {
        return [key, value];
      }
      if (value.discriminator && !value.discriminator.mapping) {
        console.warn(`Discriminator ${key} has no mapping, removing it`);
        delete value.discriminator;
      }
      return [key, value];
    })
  );
  return document;
}
