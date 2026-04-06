/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rspack, type Compiler, type Chunk } from '@rspack/core';

export interface ChunkPreloadManifestPluginOptions {
  /**
   * When true, plugin entry chunks (the direct async children of the kibana
   * entrypoint) are included alongside the named shared chunks.
   */
  includePluginEntries?: boolean;
}

/**
 * Emits `chunk-manifest.json` containing the filenames of chunks that should
 * be preloaded via `<link rel="preload">` in the HTML template.
 *
 * Always includes named shared chunks — discovered dynamically from any
 * splitChunks cache group with a static `name` (string, not a function).
 *
 * When `includePluginEntries` is true, also includes plugin entry chunks
 * discovered via the chunk graph (async children of the kibana entrypoint).
 */
export class ChunkPreloadManifestPlugin {
  private readonly includePluginEntries: boolean;

  constructor(options: ChunkPreloadManifestPluginOptions = {}) {
    this.includePluginEntries = options.includePluginEntries ?? false;
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('ChunkPreloadManifestPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ChunkPreloadManifestPlugin',
          stage: rspack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        () => {
          const splitChunksConfig = compiler.options.optimization?.splitChunks;
          const cacheGroups =
            typeof splitChunksConfig === 'object' && splitChunksConfig
              ? splitChunksConfig.cacheGroups
              : undefined;

          const staticNames = new Set<string>();
          if (cacheGroups && typeof cacheGroups === 'object') {
            for (const group of Object.values(cacheGroups)) {
              if (group && typeof group === 'object' && typeof group.name === 'string') {
                staticNames.add(group.name);
              }
            }
          }

          // When maxSize splits a named chunk, rspack generates sub-chunks
          // named `<staticName><delimiter><hash>`. We match both the exact
          // name and any maxSize-split derivatives.
          const delimiter =
            typeof splitChunksConfig === 'object' && splitChunksConfig
              ? (splitChunksConfig as Record<string, unknown>).automaticNameDelimiter ?? '-'
              : '-';

          const isNamedSharedChunk = (chunkName: string): boolean => {
            if (staticNames.has(chunkName)) return true;
            for (const staticName of staticNames) {
              if (chunkName.startsWith(`${staticName}${delimiter}`)) return true;
            }
            return false;
          };

          const collectJsFiles = (chunk: Chunk, into: string[]) => {
            for (const file of chunk.files) {
              if (file.endsWith('.js')) {
                into.push(file);
              }
            }
          };

          const chunkFiles: string[] = [];
          const sharedChunks = new Set<Chunk>();

          for (const chunk of compilation.chunks) {
            if (chunk.name && isNamedSharedChunk(chunk.name)) {
              collectJsFiles(chunk, chunkFiles);
              sharedChunks.add(chunk);
            }
          }

          if (this.includePluginEntries) {
            const entrypoint = compilation.entrypoints.get('kibana');
            if (entrypoint) {
              // `childrenIterable` yields the async chunk groups created by
              // each `import()` in the entry — one per plugin.  Each child
              // group's chunks include the plugin entry itself plus shared
              // prerequisites; we skip shared chunks already collected above.
              for (const childGroup of entrypoint.childrenIterable) {
                for (const chunk of childGroup.chunks) {
                  if (!sharedChunks.has(chunk)) {
                    collectJsFiles(chunk, chunkFiles);
                  }
                }
              }
            }
          }

          chunkFiles.sort();

          compilation.emitAsset(
            'chunk-manifest.json',
            new rspack.sources.RawSource(JSON.stringify({ chunks: chunkFiles }))
          );
        }
      );
    });
  }
}
