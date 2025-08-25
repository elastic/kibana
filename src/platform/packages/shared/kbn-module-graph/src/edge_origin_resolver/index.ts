/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TransformerCache } from '../transformer_cache_provider/types';
import { EdgeOriginResolverTransformOptions, EdgeOriginResolverTransformResult } from './types';
import { findSourceForImport } from './find_source_for_import';

/**
 * EdgeOriginResolver recursively processes import/export edges until it
 * finds the deepest path where the binding was declared.
 */
export class EdgeOriginResolver {
  constructor(private readonly cache: TransformerCache<EdgeOriginResolverTransformResult>) {}

  get(filePath: string): EdgeOriginResolverTransformResult | null {
    return this.cache.get(filePath) ?? null;
  }

  getOrCreate(
    filePath: string,
    options: EdgeOriginResolverTransformOptions
  ): EdgeOriginResolverTransformResult | null {
    let edgeOriginResolverResult = this.cache.get(filePath);

    if (edgeOriginResolverResult) {
      return edgeOriginResolverResult;
    }

    const edgeExtractorResult = options.getEdgeExtractorTransformResult(filePath);

    if (!edgeExtractorResult) {
      return null;
    }

    edgeOriginResolverResult = {
      path: filePath,
      sources: new Map(),
      edgesToProcess: new Set(edgeExtractorResult.edges),
      dependents: new Set(),
    };

    this.cache.set(filePath, edgeOriginResolverResult);

    return edgeOriginResolverResult;
  }

  process(
    filePath: string,
    options: EdgeOriginResolverTransformOptions
  ): EdgeOriginResolverTransformResult | null {
    if (options.shouldIgnore(filePath)) {
      return null;
    }

    const edgeOriginResolverResult = this.getOrCreate(filePath, options);

    if (!edgeOriginResolverResult) {
      return null;
    }

    for (const edge of edgeOriginResolverResult.edgesToProcess) {
      if (edge.import) {
        findSourceForImport(edge.import.name, edge.import.path, {
          ...options,
          getEdgeOriginResolverTransformResult: (fp) => {
            return this.getOrCreate(fp, options);
          },
        });
      }
      edgeOriginResolverResult.edgesToProcess.delete(edge);
    }

    for (const [, source] of edgeOriginResolverResult.sources) {
      if (!source) {
        continue;
      }

      for (const dependency of source?.dependencies) {
        const depResult = this.getOrCreate(dependency, options);
        if (depResult && dependency !== filePath) {
          depResult?.dependents.add(filePath);
        }
      }
    }

    return edgeOriginResolverResult;
  }
}
