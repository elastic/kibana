/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import type { OpenApiDocument } from '../openapi_types';
import { findRefs } from './find_refs';

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
    if (isExternalRef(ref) && isSchemaRef(ref)) {
      const refParts = ref.split('#/components/schemas/');
      const importedSymbol = refParts[1];
      let importPath = refParts[0];
      if (importPath) {
        importPath = importPath.replace('.schema.yaml', '.gen');
        const currentSymbols = importMap[importPath] ?? [];
        importMap[importPath] = uniq([...currentSymbols, importedSymbol]);
      }
    }
  });

  return importMap;
};

/**
 * Check if the given reference refers to something not in the same document
 * # signifies a reference from the root of the document
 * @param ref $ref value
 * @returns True if the reference is external
 */
const isExternalRef = (ref: string): boolean => !ref.startsWith('#');

/**
 * Check if the given reference refers to a schema
 * We do not currently support references to other components
 * @param ref $ref value
 * @returns True if the reference is to a schema
 */
const isSchemaRef = (ref: string): boolean => ref.includes('#/components/schemas/');
