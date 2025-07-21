/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ResolveFilePath } from '../common/types';
import {
  EdgeExtractorTransformResult,
  ExportEdge,
  ImportEdge,
  ImportExportEdge,
  ItemName,
} from '../edge_extractor/types';
import { TransformResult } from '../transformer_cache_provider/types';

export interface ItemSource {
  filePath: string;
  name: ItemName;
  dependencies: string[];
}

type ExportEdgeWithSource = ExportEdge & { source: ItemSource | null };
type ImportEdgeWithSource = ImportEdge & { source: ItemSource | null };

export type ImportExportEdgeWithSource = ExportEdgeWithSource | ImportEdgeWithSource;

export interface EdgeOriginResolverTransformResult extends TransformResult {
  sources: Map<ItemName, ItemSource | null>;
  dependents: Set<string>;
  edgesToProcess: Set<ImportExportEdge>;
}

export interface EdgeOriginResolverTransformOptions {
  getEdgeExtractorTransformResult: (filePath: string) => EdgeExtractorTransformResult | null;
  resolve: ResolveFilePath;
  shouldIgnore: (filePath: string) => boolean;
}
