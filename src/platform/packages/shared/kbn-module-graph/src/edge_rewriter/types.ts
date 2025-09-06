/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { File } from '@babel/types';
import { ResolveFilePath } from '../common/types';
import { ItemName } from '../edge_extractor/types';
import { FileParseTransformResult } from '../file_parser/types';
import { TransformResult } from '../transformer_cache_provider/types';
import { EdgeOriginResolverTransformResult } from '../edge_origin_resolver/types';

export interface EdgeRewriteResult extends TransformResult {
  rewrites: Rewrite[];
  output: File;
}

interface Rewrite {
  filePath: string;
  original: {
    filePath: string;
    itemName: ItemName;
  };
  target: {
    filePath: string;
    itemName: ItemName;
  };
}

export interface RewriteStats {
  rewrites: Rewrite[];
}

export interface EdgeRewriterTransformOptions {
  getFileParseResult: (filePath: string) => FileParseTransformResult | null;
  getEdgeResolverResult: (filePath: string) => EdgeOriginResolverTransformResult | null;
  resolve: ResolveFilePath;
  shouldIgnore: (filePath: string) => boolean;
}
