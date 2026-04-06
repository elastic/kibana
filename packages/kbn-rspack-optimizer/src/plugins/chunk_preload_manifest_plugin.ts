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

          // Build a map from cache group KEY → static name.  We use the key
          // (not the name) because rspack stamps each chunk's `idNameHints`
          // with the cache group key, giving us a reliable way to identify
          // which group produced a chunk — even for maxSize sub-chunks whose
          // names differ from the original static name.
          const staticNameGroupKeys = new Set<string>();
          if (cacheGroups && typeof cacheGroups === 'object') {
            for (const [key, group] of Object.entries(cacheGroups)) {
              if (group && typeof group === 'object' && typeof group.name === 'string') {
                staticNameGroupKeys.add(key);
              }
            }
          }

          const isNamedSharedChunk = (chunk: Chunk): boolean => {
            // idNameHints contains the cache group key(s) that produced this
            // chunk.  If ANY hint matches a static-name group, the chunk (or
            // its maxSize parent) was created by that group.
            for (const hint of chunk.idNameHints) {
              if (staticNameGroupKeys.has(hint)) return true;
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
            if (isNamedSharedChunk(chunk)) {
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
