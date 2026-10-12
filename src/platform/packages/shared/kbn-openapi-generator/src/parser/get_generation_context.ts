/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { GeneratorConfig } from '../openapi_generator';
import { getApiOperationsList } from './lib/get_api_operations_list';
import { getComponents } from './lib/get_components';
import type { ImportsMap } from './lib/get_imports_map';
import { getImportsMap } from './lib/get_imports_map';
import { normalizeSchema } from './lib/normalize_schema';
import type { NormalizedOperation, OpenApiDocument, ParsedSource } from './openapi_types';
import { getInfo } from './lib/get_info';
import { getCircularRefs } from './lib/get_circular_refs';

export interface GenerationContext {
  components: OpenAPIV3.ComponentsObject | undefined;
  operations: NormalizedOperation[];
  info: OpenAPIV3.InfoObject;
  imports: ImportsMap;
  circularRefs: Set<string>;
  config: Pick<GeneratorConfig, 'schemaNameTransform'>;
  /** True when generated code will reference helpers from @kbn/zod-helpers/v4 */
  useZodHelpers: boolean;
}

export interface RequestInputImport {
  sourcePath: string;
  names: string[];
}

export interface BundleGenerationContext {
  operations: NormalizedOperation[];
  /** One import per source module, so bundles have no duplicate or unused type imports */
  requestInputImports: RequestInputImport[];
  sources: ParsedSource[];
  info: OpenAPIV3.InfoObject;
  config: Pick<GeneratorConfig, 'schemaNameTransform'>;
}

/**
 * Group the request input types of bundled operations by the module that exports them, in the
 * order the operations are bundled.
 */
export const getRequestInputImports = (
  operations: ReadonlyArray<NormalizedOperation & { sourcePath: string }>
): RequestInputImport[] => {
  const namesBySource = new Map<string, string[]>();
  for (const { operationId, sourcePath, requestQuery, requestParams, requestBody } of operations) {
    const names: string[] = [];
    if (requestQuery) {
      names.push(`${operationId}RequestQueryInput`);
    }
    if (requestParams) {
      names.push(`${operationId}RequestParamsInput`);
    }
    if (requestBody) {
      names.push(`${operationId}RequestBodyInput`);
    }
    const sourceNames = namesBySource.get(sourcePath);
    if (sourceNames) {
      sourceNames.push(...names);
    } else if (names.length > 0) {
      namesBySource.set(sourcePath, names);
    }
  }

  return Array.from(namesBySource, ([sourcePath, names]) => ({ sourcePath, names }));
};

/**
 * Returns true when the document contains schema features that require helpers
 * from @kbn/zod-helpers/v4 in generated code:
 *   - query parameters (need ArrayFromString / BooleanFromString)
 *   - string formats 'date-math' or 'nonempty' (need isValidDateMath / isNonEmptyString)
 */
function computeUseZodHelpers(
  operations: NormalizedOperation[],
  document: OpenApiDocument
): boolean {
  if (operations.some((op) => op.requestQuery != null)) {
    return true;
  }
  const docStr = JSON.stringify(document);
  return docStr.includes('"date-math"') || docStr.includes('"nonempty"');
}

export function getGenerationContext(
  document: OpenApiDocument,
  config: GenerationContext['config']
): GenerationContext {
  const normalizedDocument = normalizeSchema(document);

  const components = getComponents(normalizedDocument);
  const operations = getApiOperationsList(normalizedDocument);
  const info = getInfo(normalizedDocument);
  const imports = getImportsMap(normalizedDocument);
  const circularRefs = getCircularRefs(normalizedDocument);
  const useZodHelpers = computeUseZodHelpers(operations, document);

  return {
    components,
    operations,
    info,
    imports,
    circularRefs,
    config,
    useZodHelpers,
  };
}
