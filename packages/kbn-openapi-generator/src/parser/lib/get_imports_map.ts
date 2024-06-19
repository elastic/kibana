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

const SCHEMA_COMPONENT_PATH = '#/components/schemas/';

export interface ImportsMap {
  [importPath: string]: string[];
}

/**
 * Find all external schema references in the document,
 * return a map of import paths and imported symbols
 *
 * @param parsedSchema Parsed OpenAPI document
 * @returns A map of import paths to symbols to import
 */
export const getImportsMap = (parsedSchema: OpenApiDocument): ImportsMap => {
  const externalSchemaRefs = findExternalSchemaRefs(parsedSchema);

  return externalSchemaRefs.reduce<ImportsMap>((importMap, ref) => {
    const { importPath, importedSymbol, genFileImportPath } = parseRef(ref);
    if (importPath) {
      const symbols = uniq([...importMap[genFileImportPath], importedSymbol]);
      importMap[genFileImportPath] = symbols;
    }
    return importMap;
  }, {});
};

/**
 * Given a component schema reference, parse the import path and imported symbol
 * And generate the import path for the generated file
 * @param ref $ref value
 * @returns An object with importPath, importedSymbol, and genFileImportPath
 */
const parseRef = (
  ref: string
): { importPath: string; importedSymbol: string; genFileImportPath: string } => {
  const [importPath, importedSymbol] = ref.split(SCHEMA_COMPONENT_PATH);
  const genFileImportPath = importPath.replace('.schema.yaml', '.gen');
  return { importPath, importedSymbol, genFileImportPath };
};

/**
 * Traverse the OpenAPI document recursively and find all external schema references
 *
 * @param parsedSchema Parsed OpenAPI document
 * @returns A list of external schema references
 */
const findExternalSchemaRefs = (parsedSchema: OpenApiDocument): string[] =>
  findRefs(parsedSchema).filter((ref) => isExternalRef(ref) && isSchemaRef(ref));

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
const isSchemaRef = (ref: string): boolean => ref.includes(SCHEMA_COMPONENT_PATH);
