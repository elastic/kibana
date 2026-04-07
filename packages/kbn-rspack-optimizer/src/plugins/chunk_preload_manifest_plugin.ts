/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rspack, type Compiler, type Chunk } from '@rspack/core';

/**
 * Emits `chunk-manifest.json` with two fields:
 *
 * - `sharedChunks`: Named shared chunks (from splitChunks cache groups with a
 *   static `name`). Used by `rendering_service.tsx` for `<link rel="preload">`
 *   in `<head>` — a small set (3-5) that gives the browser a head start on
 *   downloading critical shared code during HTML parsing.
 *
 * - `allChunks`: ALL async chunks (shared + plugin entries + unnamed shared).
 *   Used by `bootstrap_renderer.ts` to populate the bootstrap `load()` array,
 *   enabling eager parallel download of every chunk via `<script async=false>`
 *   before `kibana.bundle.js`. Rspack's JSONP mechanism queues module factories
 *   so that dynamic imports resolve without network requests once the runtime
 *   drains the queue.
 */
export class ChunkPreloadManifestPlugin {
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

          const staticNameGroupKeys = new Set<string>();
          if (cacheGroups && typeof cacheGroups === 'object') {
            for (const [key, group] of Object.entries(cacheGroups)) {
              if (group && typeof group === 'object' && typeof group.name === 'string') {
                staticNameGroupKeys.add(key);
              }
            }
          }

          const isNamedSharedChunk = (chunk: Chunk): boolean => {
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

          // 1. Collect named shared chunks (for preload)
          const sharedChunkFiles: string[] = [];
          const sharedChunks = new Set<Chunk>();

          for (const chunk of compilation.chunks) {
            if (isNamedSharedChunk(chunk)) {
              collectJsFiles(chunk, sharedChunkFiles);
              sharedChunks.add(chunk);
            }
          }

          // 2. Collect ALL async chunks (shared + plugin entries) for the load() array
          const allChunkFiles: string[] = [...sharedChunkFiles];

          const entrypoint = compilation.entrypoints.get('kibana');
          if (entrypoint) {
            for (const childGroup of entrypoint.childrenIterable) {
              for (const chunk of childGroup.chunks) {
                if (!sharedChunks.has(chunk)) {
                  collectJsFiles(chunk, allChunkFiles);
                }
              }
            }
          }

          sharedChunkFiles.sort();
          allChunkFiles.sort();

          compilation.emitAsset(
            'chunk-manifest.json',
            new rspack.sources.RawSource(
              JSON.stringify({ sharedChunks: sharedChunkFiles, allChunks: allChunkFiles })
            )
          );
        }
      );
    });
  }
}
