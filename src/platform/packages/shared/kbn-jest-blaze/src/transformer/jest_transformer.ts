/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */
import {
  TransformOptions as BabelTransformOptions,
  loadOptions,
  transformFromAstSync,
  transformSync,
} from '@babel/core';
import { SyncTransformer, TransformOptions, TransformedSource } from '@jest/transform';
import { FileWalker, ResolveFilePath, ChangeTracker } from '@kbn/module-graph';
import transformerConfig from '@kbn/test/src/jest/transforms/babel/transformer_config';
import fs from 'fs';
import createCacheKey from '@jest/create-cache-key-function';
import { castArray } from 'lodash';
import { GetCacheKeyFunction } from '../types';
import { InternalJestTransformerOptions, JestTransformerOptions } from './types';
import { wrapFileContents } from '../profiler/wrap_file_contents';
import { jestProfilerRuntime } from '../profiler/runtime';

export class JestTransformer implements SyncTransformer {
  private readonly fileWalker: FileWalker;

  private readonly changeTracker: ChangeTracker;

  private readonly initialBabelOptions: BabelTransformOptions;

  private readonly options: InternalJestTransformerOptions;

  public readonly getCacheKey?: GetCacheKeyFunction;

  constructor(options: JestTransformerOptions) {
    this.fileWalker = options.fileWalker;
    this.changeTracker = options.changeTracker;

    this.options = {
      ignorePatterns: castArray(options.ignorePatterns ?? ['node_modules']).map((pattern) => {
        if (pattern.startsWith('/') && pattern.endsWith('/')) {
          return new RegExp(pattern);
        }
        return pattern;
      }),
      moduleDirectories: [],
      rewrite: options.rewrite ?? true,
      profile: options.profile ?? false,
    };

    this.initialBabelOptions = {
      ...transformerConfig,
      presets: [
        ...transformerConfig.presets,
        require.resolve('babel-preset-jest'),
        [
          require.resolve('@babel/preset-typescript'),
          // strip type imports, we don't need them at runtime
          { allExtensions: true, onlyRemoveTypeImports: false },
        ],
      ],
      // dummy filename, otherwise loadOptions() will fail
      filename: './foo.js',
    };

    const babelOptions = loadOptions(this.initialBabelOptions);

    const cacheKeyfn = createCacheKey(
      [__filename],
      [JSON.stringify(babelOptions)]
    ) as unknown as GetCacheKeyFunction;

    // use versions from changeTracker to invalidate the cache
    // needed for dependents-based cache invalidation
    this.getCacheKey = (sourceText, sourcePath, opts) => {
      this.changeTracker.ensureFresh(opts.config.cacheDirectory);
      const version = this.changeTracker.getVersion(sourcePath) ?? 0;
      return cacheKeyfn(`${sourceText}/*v:${version}*/`, sourcePath, opts);
    };
  }

  process = (
    sourceText: string,
    sourcePath: string,
    options: TransformOptions<unknown>
  ): TransformedSource => {
    const callback: (this: typeof this) => TransformedSource = function () {
      const jestResolver = options.config.resolver ? require(options.config.resolver) : undefined;

      const extensions = options.config.moduleFileExtensions.map((ext) => `.${ext}`);

      const resolve: ResolveFilePath = (filePath, { paths }) => {
        const nextOpts = {
          paths: [...paths, ...options.config.roots, ...(this.options.moduleDirectories ?? [])],
        };

        if (jestResolver) {
          return jestResolver(filePath, {
            ...nextOpts,
            basedir: options.config.rootDir,
            extensions,
            defaultResolver: require.resolve,
          });
        }

        return require.resolve(filePath, nextOpts);
      };

      const fileWalkerResult = this.fileWalker.process(sourcePath, {
        babel: {
          transform: this.initialBabelOptions,
        },
        resolve,
        ignorePatterns: this.options.ignorePatterns,
        getFileContents: (filePath) => {
          if (filePath === sourcePath) {
            return sourceText;
          }
          let fileContents = options.cacheFS.get(filePath);

          if (!fileContents) {
            fileContents = fs.readFileSync(filePath, 'utf8');
            options.cacheFS.set(filePath, fileContents);
          }
          return fileContents;
        },
        cacheDirectory: options.config.cacheDirectory,
        rewrite: this.options.rewrite,
      });

      // maybe rewrites are disabled, or this file was ignored by the
      // in that case, just transform directly
      if (!fileWalkerResult || !fileWalkerResult.rewrite) {
        const withoutRewriteResult = transformSync(
          sourceText,
          loadOptions({
            ...this.initialBabelOptions,
            filename: sourcePath,
          })!
        );

        return {
          code: this.options.profile
            ? wrapFileContents(sourcePath, withoutRewriteResult?.code!)
            : withoutRewriteResult?.code!,
          map: withoutRewriteResult?.map,
        };
      }

      const { rewrite } = fileWalkerResult;

      const transformResult = transformFromAstSync(
        rewrite.output,
        sourceText,
        loadOptions({
          ...this.initialBabelOptions,
          filename: sourcePath,
        })!
      )!;

      const code = transformResult.code!;

      return {
        code: this.options.profile ? wrapFileContents(sourcePath, code) : code,
        map: transformResult.map,
      };
    };

    return this.options.profile
      ? jestProfilerRuntime.process(sourcePath, callback.bind(this))
      : callback.call(this);
  };
}
