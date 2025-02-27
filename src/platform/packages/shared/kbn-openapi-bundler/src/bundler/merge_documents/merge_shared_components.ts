/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import deepEqual from 'fast-deep-equal';
import { OpenAPIV3 } from 'openapi-types';
import { ResolvedDocument } from '../ref_resolver/resolved_document';
import { extractObjectByJsonPointer } from '../../utils/extract_by_json_pointer';
import { logger } from '../../logger';
import { MergeOptions } from './merge_options';

const MERGEABLE_COMPONENT_TYPES = [
  'schemas',
  'responses',
  'parameters',
  'examples',
  'requestBodies',
  'headers',
  'securitySchemes',
  'links',
  'callbacks',
] as const;

export function mergeSharedComponents(
  bundledDocuments: ResolvedDocument[],
  options: MergeOptions
): OpenAPIV3.ComponentsObject {
  const mergedComponents: Record<string, unknown> = {};

  for (const componentsType of MERGEABLE_COMPONENT_TYPES) {
    if (options.skipSecurity && componentsType === 'securitySchemes') {
      continue;
    }

    const mergedTypedComponents = mergeObjects(bundledDocuments, `/components/${componentsType}`);

    if (Object.keys(mergedTypedComponents).length === 0) {
      // Nothing was merged for that components type, go to the next component type
      continue;
    }

    mergedComponents[componentsType] = mergedTypedComponents;
  }

  return mergedComponents;
}

function mergeObjects(
  resolvedDocuments: ResolvedDocument[],
  sourcePointer: string
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  const componentNameSourceLocationMap = new Map<string, string>();
  const mergedEntityName = sourcePointer.split('/').at(-1);

  for (const resolvedDocument of resolvedDocuments) {
    const object = extractObjectToMerge(resolvedDocument, sourcePointer);

    if (!object) {
      continue;
    }

    for (const name of Object.keys(object)) {
      const componentToAdd = object[name];
      const existingComponent = merged[name];

      // Bundled documents may contain explicit references duplicates. For example
      // shared schemas from `@kbn/openapi-common` has `NonEmptyString` which is
      // widely used. After bundling references into a document (i.e. making them
      // local references) we will have duplicates. This is why we need to check
      // for exact match via `deepEqual()` to check whether components match.
      if (existingComponent && !deepEqual(componentToAdd, existingComponent)) {
        const existingSchemaLocation = componentNameSourceLocationMap.get(name);

        throw new Error(
          `❌  Unable to merge documents due to conflicts in referenced ${mergedEntityName}. Component ${chalk.yellow(
            `${sourcePointer}/${name}`
          )} is defined in ${chalk.blue(resolvedDocument.absolutePath)} and in ${chalk.magenta(
            existingSchemaLocation
          )} but definitions DO NOT match.`
        );
      }

      merged[name] = componentToAdd;
      componentNameSourceLocationMap.set(name, resolvedDocument.absolutePath);
    }
  }

  return merged;
}

function extractObjectToMerge(
  resolvedDocument: ResolvedDocument,
  sourcePointer: string
): Record<string, unknown> | undefined {
  try {
    return extractObjectByJsonPointer(resolvedDocument.document, sourcePointer);
  } catch (e) {
    logger.verbose(
      `JSON pointer "${sourcePointer}" is not resolvable in ${resolvedDocument.absolutePath}`
    );
    return;
  }
}
