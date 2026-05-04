/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OasdiffEntry } from './parse_oasdiff';
import type { RequestBodyIndex } from './build_request_body_index';

export const REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID =
  'kbn:request-additional-properties-tightened';

const TIGHTENING_TEXT =
  'Request body schema disallows extra fields (additionalProperties: false). Clients sending unknown keys will now receive 400.';

export interface DetectionResult {
  entries: OasdiffEntry[];
  warnings: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isTighteningTransition = (apa: unknown): boolean =>
  isObject(apa) && (apa.from === null || apa.from === true) && apa.to === false;

// Walks a schema-shaped diff and pushes relative JSON pointers (within the
// schema root) where additionalPropertiesAllowed transitions from null|true to
// false. The pointer for a tightening on the schema root is "" (empty); nested
// forms look like "/properties/x" or "/oneOf/0/properties/y".
const collectTighteningsInSchemaDiff = (
  schemaDiff: unknown,
  pointer: string,
  out: string[]
): void => {
  if (!isObject(schemaDiff)) return;

  if (isTighteningTransition(schemaDiff.additionalPropertiesAllowed)) {
    out.push(pointer);
  }

  const properties = schemaDiff.properties;
  if (isObject(properties) && isObject(properties.modified)) {
    for (const [propName, propDiff] of Object.entries(properties.modified)) {
      collectTighteningsInSchemaDiff(propDiff, `${pointer}/properties/${propName}`, out);
    }
  }

  if (isObject(schemaDiff.items)) {
    collectTighteningsInSchemaDiff(schemaDiff.items, `${pointer}/items`, out);
  }

  for (const composition of ['oneOf', 'anyOf', 'allOf'] as const) {
    const branchContainer = schemaDiff[composition];
    if (!isObject(branchContainer)) continue;
    const modifiedBranches = branchContainer.modified;
    if (!Array.isArray(modifiedBranches)) continue;
    for (let i = 0; i < modifiedBranches.length; i++) {
      const branch = modifiedBranches[i];
      if (!isObject(branch)) continue;
      const branchDiff = branch.diff;
      if (branchDiff !== undefined) {
        collectTighteningsInSchemaDiff(branchDiff, `${pointer}/${composition}/${i}`, out);
      }
    }
  }
};

const buildEntry = ({
  path,
  method,
  source,
}: {
  path: string;
  method: string;
  source: string;
}): OasdiffEntry => ({
  id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
  level: 3,
  text: TIGHTENING_TEXT,
  operation: method,
  path,
  source,
});

export const detectAdditionalPropertiesTightening = (
  structuralDiff: unknown,
  requestBodyIndex: RequestBodyIndex
): DetectionResult => {
  if (!isObject(structuralDiff)) return { entries: [], warnings: [] };

  const entries: OasdiffEntry[] = [];
  const warnings: string[] = [];

  // 1. Collect component-level tightenings, fan out via the reverse index, and
  //    record (path, method, relativePointer) triples covered so we can skip
  //    their reflections under paths.modified later.
  const skipKeys = new Set<string>();

  const components = structuralDiff.components;
  if (
    isObject(components) &&
    isObject(components.schemas) &&
    isObject(components.schemas.modified)
  ) {
    const modifiedSchemas = components.schemas.modified as Record<string, unknown>;
    for (const [componentName, schemaDiff] of Object.entries(modifiedSchemas)) {
      const pointers: string[] = [];
      collectTighteningsInSchemaDiff(schemaDiff, '', pointers);
      if (pointers.length === 0) continue;

      const consumers = requestBodyIndex.get(componentName) ?? [];
      if (consumers.length === 0) {
        warnings.push(
          `Component schema '${componentName}' tightened additionalProperties but has zero request-body consumers; entry intentionally dropped.`
        );
        continue;
      }

      for (const consumer of consumers) {
        const upperMethod = consumer.method.toUpperCase();
        for (const pointer of pointers) {
          skipKeys.add(`${consumer.path}|${upperMethod}|${pointer}`);
          entries.push(
            buildEntry({
              path: consumer.path,
              method: upperMethod,
              source: `/components/schemas/${componentName}${pointer}`,
            })
          );
        }
      }
    }
  }

  // 2. Walk paths.modified.<path>.operations.modified.<METHOD>.requestBody.content.modified.<media>.schema...
  //    Emit entries for inline schema tightenings, skipping any reflection of a
  //    component-level tightening already emitted in step 1.
  const paths = structuralDiff.paths;
  if (!isObject(paths) || !isObject(paths.modified)) return { entries, warnings };

  const modifiedPaths = paths.modified as Record<string, unknown>;
  for (const [pathName, pathEntry] of Object.entries(modifiedPaths)) {
    if (!isObject(pathEntry) || !isObject(pathEntry.operations)) continue;
    const operations = pathEntry.operations as Record<string, unknown>;
    if (!isObject(operations.modified)) continue;
    const opsModified = operations.modified as Record<string, unknown>;

    for (const [method, opEntry] of Object.entries(opsModified)) {
      if (!isObject(opEntry) || !isObject(opEntry.requestBody)) continue;
      const requestBody = opEntry.requestBody as Record<string, unknown>;
      if (!isObject(requestBody.content)) continue;
      const content = requestBody.content as Record<string, unknown>;
      if (!isObject(content.modified)) continue;
      const contentModified = content.modified as Record<string, unknown>;

      const upperMethod = method.toUpperCase();

      for (const [mediaType, mediaDiff] of Object.entries(contentModified)) {
        if (!isObject(mediaDiff) || !isObject(mediaDiff.schema)) continue;
        const pointers: string[] = [];
        collectTighteningsInSchemaDiff(mediaDiff.schema, '', pointers);
        for (const pointer of pointers) {
          if (skipKeys.has(`${pathName}|${upperMethod}|${pointer}`)) continue;
          entries.push(
            buildEntry({
              path: pathName,
              method: upperMethod,
              source: `/requestBody/content/${mediaType}/schema${pointer}`,
            })
          );
        }
      }
    }
  }

  return { entries, warnings };
};
