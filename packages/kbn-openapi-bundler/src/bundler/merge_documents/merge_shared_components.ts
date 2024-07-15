/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import deepEqual from 'fast-deep-equal';
import chalk from 'chalk';
import { insertRefByPointer } from '../../utils/insert_by_json_pointer';
import { ResolvedRef } from '../ref_resolver/resolved_ref';
import { BundledDocument } from '../bundle_document';

export function mergeSharedComponents(
  bundledDocuments: BundledDocument[]
): OpenAPIV3.ComponentsObject {
  const componentsMap = new Map<string, ResolvedRef>();
  const mergedComponents: Record<string, unknown> = {};

  for (const bundledDocument of bundledDocuments) {
    mergeRefsToMap(bundledDocument.bundledRefs, componentsMap);
  }

  for (const resolvedRef of componentsMap.values()) {
    insertRefByPointer(resolvedRef.pointer, resolvedRef.refNode, mergedComponents);
  }

  return mergedComponents;
}

function mergeRefsToMap(bundledRefs: ResolvedRef[], componentsMap: Map<string, ResolvedRef>): void {
  for (const bundledRef of bundledRefs) {
    const existingRef = componentsMap.get(bundledRef.pointer);

    if (!existingRef) {
      componentsMap.set(bundledRef.pointer, bundledRef);
      continue;
    }

    if (deepEqual(existingRef.refNode, bundledRef.refNode)) {
      continue;
    }

    throw new Error(
      `❌  Unable to bundle documents due to conflicts in references. Schema ${chalk.yellow(
        bundledRef.pointer
      )} is defined in ${chalk.blue(existingRef.absolutePath)} and in ${chalk.magenta(
        bundledRef.absolutePath
      )} but has not matching definitions.`
    );
  }
}
