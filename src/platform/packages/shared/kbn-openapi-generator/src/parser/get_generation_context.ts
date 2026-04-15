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
import { extractByJsonPointer } from './lib/helpers/extract_by_json_pointer';
import { parseRef } from './lib/helpers/parse_ref';

export interface GenerationContext {
  components: OpenAPIV3.ComponentsObject | undefined;
  operations: NormalizedOperation[];
  info: OpenAPIV3.InfoObject;
  imports: ImportsMap;
  circularRefs: Set<string>;
  config: Pick<GeneratorConfig, 'schemaNameTransform' | 'zodHelpersImportMode'>;
  /**
   * Helpers from @kbn/zod-helpers/v4 that are actually used in generated Zod
   * (query/path coercions and string formats). Omitted names are not imported.
   */
  zodHelpersImports: readonly string[];
  /** True when {@link zodHelpersImports} is non-empty (for Handlebars templates). */
  hasZodHelpersImports: boolean;
  /**
   * @deprecated Use {@link hasZodHelpersImports}. Preserved so existing consumers of
   * `GenerationContext` keep compiling; equals `hasZodHelpersImports`.
   */
  useZodHelpers: boolean;
}

export interface BundleGenerationContext {
  operations: NormalizedOperation[];
  sources: ParsedSource[];
  info: OpenAPIV3.InfoObject;
  config: Pick<GeneratorConfig, 'schemaNameTransform' | 'zodHelpersImportMode'>;
}

const ZOD_HELPERS_ORDER = [
  'isValidDateMath',
  'isNonEmptyString',
  'ArrayFromString',
  'BooleanFromString',
] as const;

function collectZodHelpersFromParamSchema(
  schema: unknown,
  document: OpenApiDocument,
  needed: Set<string>,
  visitedRefs: Set<string> = new Set()
): void {
  if (!schema || typeof schema !== 'object') {
    return;
  }
  const s = schema as Record<string, unknown>;
  if (typeof s.$ref === 'string') {
    // zod_query_item emits a schema identifier for $ref (see zod_query_item.handlebars); helpers
    // for that component live in this file only if we inline the resolved schema here.
    try {
      const { uri, pointer } = parseRef(s.$ref);
      if (uri !== '') {
        return;
      }
      if (visitedRefs.has(pointer)) {
        return;
      }
      visitedRefs.add(pointer);
      const resolved = extractByJsonPointer(document, pointer);
      collectZodHelpersFromParamSchema(resolved, document, needed, visitedRefs);
    } catch {
      // ignore unresolvable refs
    }
    return;
  }
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(s[key])) {
      for (const item of s[key] as unknown[]) {
        collectZodHelpersFromParamSchema(item, document, needed, visitedRefs);
      }
    }
  }
  const t = s.type;
  if (t === 'boolean') {
    needed.add('BooleanFromString');
    return;
  }
  if (t === 'array') {
    needed.add('ArrayFromString');
    collectZodHelpersFromParamSchema(s.items, document, needed, visitedRefs);
    return;
  }
  if (t === 'object' && s.properties && typeof s.properties === 'object') {
    for (const prop of Object.values(s.properties)) {
      collectZodHelpersFromParamSchema(prop, document, needed, visitedRefs);
    }
    const ap = s.additionalProperties;
    if (ap !== undefined && ap !== true && ap !== false && typeof ap === 'object' && ap !== null) {
      collectZodHelpersFromParamSchema(ap, document, needed, visitedRefs);
    }
    return;
  }
  if (t === 'string') {
    if (s.format === 'date-math') {
      needed.add('isValidDateMath');
    }
    if (s.format === 'nonempty') {
      needed.add('isNonEmptyString');
    }
  }
}

/**
 * Collects isValidDateMath / isNonEmptyString needs from schemas emitted via zod_schema_item
 * (components, request/response bodies). Matches zod_schema_item type_string handling.
 */
function collectStringSuperRefineHelpersFromSchema(
  schema: unknown,
  document: OpenApiDocument,
  needed: Set<string>,
  visitedRefs: Set<string> = new Set()
): void {
  if (!schema || typeof schema !== 'object') {
    return;
  }
  const s = schema as Record<string, unknown>;
  if (typeof s.$ref === 'string') {
    try {
      const { uri, pointer } = parseRef(s.$ref);
      if (uri !== '') {
        return;
      }
      if (visitedRefs.has(pointer)) {
        return;
      }
      visitedRefs.add(pointer);
      const resolved = extractByJsonPointer(document, pointer);
      collectStringSuperRefineHelpersFromSchema(resolved, document, needed, visitedRefs);
    } catch {
      // ignore
    }
    return;
  }
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(s[key])) {
      for (const item of s[key] as unknown[]) {
        collectStringSuperRefineHelpersFromSchema(item, document, needed, visitedRefs);
      }
    }
  }
  const t = s.type;
  if (t === 'string') {
    if (s.format === 'date-math') {
      needed.add('isValidDateMath');
    }
    if (s.format === 'nonempty') {
      needed.add('isNonEmptyString');
    }
    return;
  }
  if (t === 'array' && s.items) {
    collectStringSuperRefineHelpersFromSchema(s.items, document, needed, visitedRefs);
    return;
  }
  if (t === 'object' && s.properties && typeof s.properties === 'object') {
    for (const prop of Object.values(s.properties)) {
      collectStringSuperRefineHelpersFromSchema(prop, document, needed, visitedRefs);
    }
    const ap = s.additionalProperties;
    if (ap !== undefined && ap !== true && ap !== false && typeof ap === 'object' && ap !== null) {
      collectStringSuperRefineHelpersFromSchema(ap, document, needed, visitedRefs);
    }
  }
}

/**
 * Lists zod-helpers actually referenced by generated code for this document:
 * - `isValidDateMath` / `isNonEmptyString` from zod_schema_item string formats on bodies/components
 * - `ArrayFromString` / `BooleanFromString` / string formats from query/path shapes (see zod_query_item)
 */
function computeZodHelpersImports(
  operations: NormalizedOperation[],
  document: OpenApiDocument
): readonly string[] {
  const needed = new Set<string>();
  for (const op of operations) {
    if (op.requestQuery) {
      collectZodHelpersFromParamSchema(op.requestQuery, document, needed);
    }
    if (op.requestParams) {
      collectZodHelpersFromParamSchema(op.requestParams, document, needed);
    }
    if (op.requestBody) {
      collectStringSuperRefineHelpersFromSchema(op.requestBody, document, needed);
    }
    if (op.response) {
      collectStringSuperRefineHelpersFromSchema(op.response, document, needed);
    }
    if (op.requestAttachment) {
      collectStringSuperRefineHelpersFromSchema(op.requestAttachment, document, needed);
    }
  }
  if (document.components?.schemas) {
    for (const sch of Object.values(document.components.schemas)) {
      collectStringSuperRefineHelpersFromSchema(sch, document, needed);
    }
  }
  return ZOD_HELPERS_ORDER.filter((name) => needed.has(name));
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
  const minimalZodHelpers = computeZodHelpersImports(operations, document);
  const zodHelpersImports: readonly string[] =
    config.zodHelpersImportMode === 'full' && minimalZodHelpers.length > 0
      ? [...ZOD_HELPERS_ORDER]
      : minimalZodHelpers;
  const hasZodHelpersImports = zodHelpersImports.length > 0;

  return {
    components,
    operations,
    info,
    imports,
    circularRefs,
    config,
    zodHelpersImports,
    hasZodHelpersImports,
    useZodHelpers: hasZodHelpersImports,
  };
}
