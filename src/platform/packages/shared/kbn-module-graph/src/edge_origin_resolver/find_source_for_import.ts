/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ItemName } from '../edge_extractor/types';
import {
  EdgeOriginResolverTransformOptions,
  EdgeOriginResolverTransformResult,
  ItemSource,
} from './types';

/**
 * Finds the original source (path + exported name) for an imported item.
 */
export function findSourceForImport(
  itemName: ItemName,
  importSpecifier: string,
  options: EdgeOriginResolverTransformOptions & {
    getEdgeOriginResolverTransformResult: (
      filePath: string
    ) => EdgeOriginResolverTransformResult | null;
  },
  dependencies: string[] = [],
  skipFallback: boolean = false
): ItemSource | null {
  // side-effect import
  if (itemName === null) {
    return null;
  }

  if (options.shouldIgnore(importSpecifier)) {
    return null;
  }

  const edgeExtractorResult = options.getEdgeExtractorTransformResult(importSpecifier);

  const edgeResolverResult = options.getEdgeOriginResolverTransformResult(importSpecifier);

  if (!edgeExtractorResult || !edgeResolverResult) {
    return null;
  }

  function normalizeItemSource(source: ItemSource | null): ItemSource | null {
    if (!source) return source;
    // Ensure consumers never see a wildcard item name; treat it as module-level import
    return source.name === '*' ? { ...source, name: null } : source;
  }

  function storeSourceAndReturn(source: ItemSource | null) {
    const normalized = normalizeItemSource(source);
    edgeResolverResult!.sources.set(itemName, normalized);
    return normalized;
  }

  // see if we have a cached result
  const source = edgeResolverResult.sources.get(itemName);

  if (source !== undefined) {
    return source;
  }

  // set to null temporarily to prevent circular loops
  edgeResolverResult.sources.set(itemName, null);

  // try to match an export by name
  const matchingExport = edgeExtractorResult.exportsByName.get(itemName);

  if (matchingExport) {
    // either use the import attached to the export edge,
    // or lookup an import by its local name
    const imp =
      matchingExport.import || edgeExtractorResult.importsByLocal.get(matchingExport.local)?.import;

    const next = storeSourceAndReturn(
      imp
        ? findSourceForImport(
            imp.name,
            imp.path,
            options,
            [...dependencies, importSpecifier],
            skipFallback
          )
        : // if there is no import, we set the filepath + export name as the source
          {
            filePath: importSpecifier,
            name: matchingExport.export.name,
            dependencies: [...dependencies, importSpecifier],
          }
    );

    return next;
  }

  for (const importedPath of edgeExtractorResult.unnamedNamespaceExports) {
    const sourceViaNamespaceExports = findSourceForImport(
      itemName,
      importedPath,
      options,
      [...dependencies, importSpecifier],
      /* skipFallback */ true
    );
    if (sourceViaNamespaceExports) {
      return storeSourceAndReturn(sourceViaNamespaceExports);
    }
  }

  return storeSourceAndReturn(
    skipFallback
      ? null
      : {
          filePath: importSpecifier,
          name: itemName,
          dependencies: [...dependencies, importSpecifier],
        }
  );
}
