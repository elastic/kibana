/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TransformerCache } from '../transformer_cache_provider/types';
import { rewriteImportsAndExports } from './rewrite_imports_and_exports';
import { EdgeRewriteResult } from './types';
import { EdgeRewriterTransformOptions } from './types';

export class EdgeRewriter {
  constructor(private readonly cache: TransformerCache<EdgeRewriteResult>) {}

  process(filePath: string, options: EdgeRewriterTransformOptions): EdgeRewriteResult | null {
    if (options.shouldIgnore(filePath)) {
      return null;
    }
    let result: EdgeRewriteResult | undefined | null = this.cache.get(filePath);

    if (result) {
      return result;
    }

    result = rewriteImportsAndExports(filePath, options);
    if (result) {
      this.cache.set(filePath, result);
    }
    return result;
  }
}
