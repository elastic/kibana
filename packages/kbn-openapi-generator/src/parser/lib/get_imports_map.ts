/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import type { OpenApiDocument } from '../openapi_types';
import { findRefs } from './helpers/find_refs';

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
