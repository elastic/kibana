/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import type { OpenApiDocument } from '../openapi_types';
import { traverseObject } from './traverse_object';

export interface ImportsMap {
  [importPath: string]: string[];
}

/**
 * Traverse the OpenAPI document, find all external references, and return a map
 * of import paths and imported symbols
 *
 * @param parsedSchema Parsed OpenAPI document
 * @returns A map of import paths to symbols to import
 */
export const getImportsMap = (parsedSchema: OpenApiDocument): ImportsMap => {
  const importMap: Record<string, string[]> = {}; // key: import path, value: list of symbols to import
  const refs = findRefs(parsedSchema);
  refs.forEach((ref) => {
    const refParts = ref.split('#/components/schemas/');
    const importedSymbol = refParts[1];
    let importPath = refParts[0];
    if (importPath) {
      importPath = importPath.replace('.schema.yaml', '.gen');
      const currentSymbols = importMap[importPath] ?? [];
      importMap[importPath] = uniq([...currentSymbols, importedSymbol]);
    }
  });

  return importMap;
};

/**
 * Check if an object has a $ref property
 *
 * @param obj Any object
 * @returns True if the object has a $ref property
 */
const hasRef = (obj: unknown): obj is { $ref: string } => {
  return typeof obj === 'object' && obj !== null && '$ref' in obj;
};

/**
 * Traverse the OpenAPI document recursively and find all references
 *
 * @param obj Any object
 * @returns A list of external references
 */
function findRefs(obj: unknown): string[] {
  const refs: string[] = [];

  traverseObject(obj, (element) => {
    if (hasRef(element)) {
      refs.push(element.$ref);
    }
  });

  return refs;
}
