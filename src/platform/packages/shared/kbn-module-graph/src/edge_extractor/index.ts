/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { partition } from 'lodash';
import { TransformerCache } from '../transformer_cache_provider/types';
import { extractEdges } from './extract_edges';
import { ExportEdge, EdgeExtractorTransformOptions, EdgeExtractorTransformResult } from './types';
import { normalizeEdges } from './normalize_edges';

/**
 * EdgeExtractor walks import/export declarations in a file
 * and stores them in a more convenient data structure. It also converts
 * import specifiers into absolute paths.
 */
export class EdgeExtractor {
  constructor(private readonly cache: TransformerCache<EdgeExtractorTransformResult>) {}

  process(
    filePath: string,
    options: EdgeExtractorTransformOptions
  ): EdgeExtractorTransformResult | null {
    if (options.shouldIgnore(filePath)) {
      return null;
    }

    let edgeResult = this.cache.get(filePath);

    if (edgeResult) {
      return edgeResult;
    }

    const result = options.getFileParseResult(filePath);

    if (!result) {
      return null;
    }

    const resolveOptions = { paths: [Path.dirname(filePath)] };

    const resolver = (specifier: string) => options.resolve(specifier, resolveOptions);

    const edges = normalizeEdges(extractEdges(filePath, result.parsed, resolver));

    const [exports, imports] = partition(edges, (edge): edge is ExportEdge => 'export' in edge);

    edgeResult = {
      path: filePath,
      edges,
      importsByLocal: new Map(imports.map((edge) => [edge.local, edge])),
      exportsByName: new Map(exports.map((edge) => [edge.export.name, edge])),
      unnamedNamespaceExports: exports
        .filter((edge) => edge.import?.name === '*' && edge.export.name === '*')
        .map((edge) => edge.import!.path),
    };

    this.cache.set(filePath, edgeResult);

    edgeResult.edges = normalizeEdges(edgeResult.edges);

    return edgeResult;
  }
}
