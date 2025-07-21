/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TransformOptions } from '@babel/core';
import { ResolveFilePath } from '../common/types';
import { FileParseTransformResult } from '../file_parser/types';
import { EdgeRewriteResult } from '../edge_rewriter/types';
import { EdgeOriginResolverTransformResult } from '../edge_origin_resolver/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FileWalkerOptions {}

export interface FileWalkerTransformResult {
  parse: FileParseTransformResult | null;
  edge: EdgeOriginResolverTransformResult | null;
  rewrite: EdgeRewriteResult | null;
}

export interface FileWalkerTransformOptions {
  getFileContents: (filePath: string) => string;
  babel: {
    transform: TransformOptions;
  };
  resolve: ResolveFilePath;
  ignorePatterns?: Array<string | RegExp>;
  cacheDirectory: string;
  rewrite: boolean;
}
