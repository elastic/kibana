/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { loadOptions } from '@babel/core';
import * as babel from '@babel/core';
import { File } from '@babel/types';
import { TransformerCache } from '../transformer_cache_provider/types';
import { FileParseTransformOptions, FileParseTransformResult } from './types';

export class FileParser {
  constructor(private readonly cache: TransformerCache<FileParseTransformResult>) {
    this.cache = cache;
  }

  process(
    absoluteFilePath: string,
    options: FileParseTransformOptions
  ): FileParseTransformResult | null {
    if (options.shouldIgnore(absoluteFilePath)) {
      return null;
    }

    let cached = this.cache.get(absoluteFilePath);

    if (!cached) {
      const input = options.getFileContents(absoluteFilePath);

      const result =
        babel.parseSync(input, {
          ...loadOptions({
            ...options.babel.transform,
            filename: absoluteFilePath,
            configFile: false,
          }),
          ast: true,
          code: false,
        }) ?? undefined;

      if (!result) {
        throw new Error(`Babel did not return a parse result for ${absoluteFilePath}`);
      }

      cached = {
        path: absoluteFilePath,
        parsed: {
          ast: result as File,
          code: input,
        },
      };

      this.cache.set(absoluteFilePath, cached);
    }

    return cached;
  }
}
