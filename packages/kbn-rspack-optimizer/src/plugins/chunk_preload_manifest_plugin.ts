/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Compiler, Chunk } from '@rspack/core';
import { rspack } from '../rspack_runtime';
import { CHUNK_MANIFEST_FILENAME } from '../paths';

/**
 * Emits `chunk-manifest.json` with two fields:
 *
 * - `allChunks`: async chunks to preload (named shared chunks + plugin entry
 *   children). Cache groups with `name: false` are omitted so those chunks stay
 *   on demand. Retained as a compatibility fallback.
 * - `entrypointChunks`: the exact entry chunk and shared prerequisites for each
 *   plugin ID (including `core`). Used by `bootstrap_renderer.ts` to preload only
 *   the bundles selected for the current page.
 *
 * Rspack's JSONP mechanism queues module factories so that dynamic imports
 * resolve without network requests once the runtime drains the queue.
 *
 * If CI or FTR shows ChunkLoadError / 404 on /bundles/chunks/, compare emitted assets to
 * chunk-manifest.json and validate script order vs Rspack chunk graph (alphabetical sort here
 * is for stability; change only with failing-log evidence).
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
          const onDemandGroupKeys = new Set<string>();
          if (cacheGroups && typeof cacheGroups === 'object') {
            for (const [key, group] of Object.entries(cacheGroups)) {
              if (!group || typeof group !== 'object') continue;
              if (typeof group.name === 'string') {
                staticNameGroupKeys.add(key);
              } else if (group.name === false) {
                onDemandGroupKeys.add(key);
              }
            }
          }

          const chunkHasHint = (chunk: Chunk, keys: Set<string>): boolean => {
            for (const hint of chunk.idNameHints) {
              if (keys.has(hint)) return true;
            }
            return false;
          };

          const collectJsFiles = (chunk: Chunk, into: Set<string>) => {
            for (const file of chunk.files) {
              if (file.endsWith('.js')) {
                into.add(file);
              }
            }
          };

          // Named shared chunks first, then remaining entrypoint children.
          // `name: false` groups (jqueryFlot) stay out of bootstrap even when
          // splitChunks places them in an entrypoint child group.
          const allChunkFiles = new Set<string>();
          const seen = new Set<Chunk>();

          for (const chunk of compilation.chunks) {
            if (chunkHasHint(chunk, staticNameGroupKeys)) {
              collectJsFiles(chunk, allChunkFiles);
              seen.add(chunk);
            }
          }

          const entrypoint = compilation.entrypoints.get('kibana');
          const entrypointChunkFiles = new Map<string, Set<string>>();
          if (entrypoint) {
            for (const childGroup of entrypoint.childrenIterable) {
              const pluginChunkName =
                childGroup.name ??
                childGroup.chunks.find((chunk) => chunk.name?.startsWith('plugin-'))?.name;
              const pluginId = pluginChunkName?.startsWith('plugin-')
                ? pluginChunkName.slice('plugin-'.length)
                : undefined;

              for (const chunk of childGroup.chunks) {
                if (chunkHasHint(chunk, onDemandGroupKeys)) continue;

                if (pluginId) {
                  const files = entrypointChunkFiles.get(pluginId) ?? new Set<string>();
                  collectJsFiles(chunk, files);
                  entrypointChunkFiles.set(pluginId, files);
                }

                if (!seen.has(chunk)) {
                  collectJsFiles(chunk, allChunkFiles);
                  seen.add(chunk);
                }
              }
            }
          }

          const entrypointChunks = Object.fromEntries(
            [...entrypointChunkFiles.entries()]
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([pluginId, files]) => [pluginId, [...files].sort()])
          );

          compilation.emitAsset(
            CHUNK_MANIFEST_FILENAME,
            new rspack.sources.RawSource(
              JSON.stringify({ allChunks: [...allChunkFiles].sort(), entrypointChunks })
            )
          );
        }
      );
    });
  }
}
