/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Resolve a reference object to a parameter object
 * @param param - The reference object to resolve, e.g. { "$ref": "#/components/parameters/search-index" }
 * @param openApiDocument - The OpenAPI document
 * @returns The parameter object
 */
export function resolveReferenceObject(reference: string, jsonSchema: unknown): unknown | null {
  const path = reference.replace(/^#\//, '').split('/');
  let current: unknown = jsonSchema;
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }

  return current;
}
