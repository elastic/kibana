/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import resolve from 'resolve';
import { EdgeExtractor } from '../edge_extractor';
import {
  EdgeExtractorTransformOptions,
  EdgeExtractorTransformResult,
} from '../edge_extractor/types';
import { EdgeOriginResolver } from '../edge_origin_resolver';
import {
  EdgeOriginResolverTransformOptions,
  EdgeOriginResolverTransformResult,
} from '../edge_origin_resolver/types';
import { EdgeRewriter } from '../edge_rewriter';
import { EdgeRewriteResult, EdgeRewriterTransformOptions } from '../edge_rewriter/types';
import { FileParser } from '../file_parser';
import { FileParseTransformOptions, FileParseTransformResult } from '../file_parser/types';
import { TransformerCacheProvider } from '../transformer_cache_provider';
import { FileWalkerOptions, FileWalkerTransformOptions, FileWalkerTransformResult } from './types';

export class FileWalker {
  private readonly cacheProvider = new TransformerCacheProvider();

  private readonly fileParser: FileParser;
  private readonly edgeExtractor: EdgeExtractor;
  private readonly edgeOriginResolver: EdgeOriginResolver;
  private readonly edgeRewriter: EdgeRewriter;

  // FileWalker no longer tracks versions; caching/versioning is handled externally

  constructor(options: FileWalkerOptions) {
    const fileParserCache = this.cacheProvider.create<FileParseTransformResult>();

    const edgeExtractorCache =
      this.cacheProvider.create<EdgeExtractorTransformResult>(fileParserCache);

    const edgeResolverCache =
      this.cacheProvider.create<EdgeOriginResolverTransformResult>(edgeExtractorCache);

    const rewriteCache = this.cacheProvider.create<EdgeRewriteResult>(edgeResolverCache);

    this.fileParser = new FileParser(fileParserCache);
    this.edgeExtractor = new EdgeExtractor(edgeExtractorCache);
    this.edgeOriginResolver = new EdgeOriginResolver(edgeResolverCache);
    this.edgeRewriter = new EdgeRewriter(rewriteCache);
  }

  getDependents(filePath: string): string[] {
    return Array.from(this.edgeOriginResolver.get(filePath)?.dependents ?? []);
  }

  public invalidateChangedFiles(changedFiles: string[]): void {
    this.cacheProvider.invalidate(...changedFiles);
  }

  process(filePath: string, options: FileWalkerTransformOptions): FileWalkerTransformResult | null {
    const shouldIgnore = (path: string) => {
      const shouldIgnorePath =
        (resolve.isCore(path) ||
          options.ignorePatterns?.some((pattern) => {
            if (typeof pattern === 'string') {
              return path.includes(pattern);
            }
            return pattern.test(path);
          })) ??
        false;
      return shouldIgnorePath;
    };

    if (shouldIgnore(filePath)) {
      return null;
    }

    const fileParseOptions: FileParseTransformOptions = {
      babel: options.babel,
      getFileContents: options.getFileContents,
      shouldIgnore,
    };

    const edgeExtractorOptions: EdgeExtractorTransformOptions = {
      getFileParseResult: (requestedFilePath) => {
        return this.fileParser.process(requestedFilePath, fileParseOptions);
      },
      resolve: options.resolve,
      shouldIgnore,
    };

    const edgeOriginResolverOptions: EdgeOriginResolverTransformOptions = {
      getEdgeExtractorTransformResult: (absoluteFilePath) => {
        return this.edgeExtractor.process(absoluteFilePath, edgeExtractorOptions);
      },
      resolve: options.resolve,
      shouldIgnore,
    };

    // Manifest processing/versioning is handled by an external controller

    // First, parse the file into an AST
    const fileParseResult = this.fileParser.process(filePath, fileParseOptions);

    // extract the edges
    this.edgeExtractor.process(filePath, edgeExtractorOptions);

    // resolve the deepest path possible for each imported binding
    const edgeResolverResult = this.edgeOriginResolver.process(filePath, edgeOriginResolverOptions);

    const edgeRewriteOptions: EdgeRewriterTransformOptions = {
      getFileParseResult: (absoluteFilePath) =>
        this.fileParser.process(absoluteFilePath, fileParseOptions),
      getEdgeResolverResult: (absoluteFilePath) =>
        this.edgeOriginResolver.process(absoluteFilePath, edgeOriginResolverOptions),
      resolve: options.resolve,
      shouldIgnore,
    };

    // Rewrite import/exports to the deepest path possible.
    const rewriteResult = options.rewrite
      ? this.edgeRewriter.process(filePath, edgeRewriteOptions)
      : null;

    return {
      parse: fileParseResult,
      edge: edgeResolverResult,
      rewrite: rewriteResult,
    };
  }
}
