/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniq } from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import type { OpenApiDocument } from '../openapi_types';
import { findRefs } from './helpers/find_refs';
import { isLocalRef } from './helpers/is_local_ref';

const HTTP_METHODS = Object.values(OpenAPIV3.HttpMethods);

/**
 * The only response code emitted as Zod by `zod_operation_schema` / `getApiOperationsList`.
 * Must stay aligned with the `responses['200']` slice used in `get_api_operations_list.ts`.
 */
const SUCCESS_RESPONSE_CODE = '200' as const;

/**
 * Returns a copy of the document where each operation keeps only the `200` response entry
 * under `paths.*.*.responses`. This must stay aligned with `getApiOperationsList`
 * (`get_api_operations_list.ts`): emitted Zod for an operation uses `responses['200']` only,
 * so external `$ref`s that appear solely under `4xx`/`5xx` (or other non-200 codes) are not
 * materialized in generated code and must not force cross-file imports for those symbols.
 *
 * `components` is not modified—schemas there are always candidates for codegen imports.
 */
function cloneDocumentOmittingNonSuccessResponses(parsedSchema: OpenApiDocument): OpenApiDocument {
  const clone = structuredClone(parsedSchema) as OpenApiDocument;
  if (!clone.paths) {
    return clone;
  }
  for (const pathItem of Object.values(clone.paths)) {
    if (!pathItem) {
      continue;
    }
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (op?.responses) {
        for (const code of Object.keys(op.responses)) {
          if (code !== SUCCESS_RESPONSE_CODE) {
            delete op.responses[code];
          }
        }
      }
    }
  }
  return clone;
}

export interface ImportsMap {
  [importPath: string]: string[];
}

/**
 * Traverse the OpenAPI document, find all external `$ref`s, and return a map of import paths
 * to symbols to import from adjacent `*.gen.ts` files.
 *
 * Discovery runs on `cloneDocumentOmittingNonSuccessResponses`: path-level `$ref`s under
 * non-200 responses are ignored so import lists match what `zod_operation_schema` can emit
 * for success responses (same `responses['200']` slice as `getApiOperationsList`).
 *
 * @param parsedSchema Parsed OpenAPI document
 * @returns A map of import paths to symbols to import
 */
export const getImportsMap = (parsedSchema: OpenApiDocument): ImportsMap => {
  const importMap: Record<string, string[]> = {}; // key: import path, value: list of symbols to import
  const refs = findRefs(cloneDocumentOmittingNonSuccessResponses(parsedSchema));
  refs.forEach((ref) => {
    // Skip local references (e.g., #/components/schemas/SomeName) as they don't need imports
    if (isLocalRef(ref)) {
      return;
    }

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
