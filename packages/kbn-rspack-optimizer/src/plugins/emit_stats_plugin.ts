/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import type { Compiler } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';
import { STATS_FILENAME } from '../paths';

/**
 * Context directories for focused plugins, used to match modules by file path.
 * Required because RSPack's splitChunks distributes plugin modules across
 * shared chunks — chunk-name matching alone misses most of the plugin's code.
 */
export interface FocusPluginInfo {
  id: string;
  contextDir: string;
}

/**
 * Filter stats to include:
 * 1. Chunks whose name exactly matches `plugin-<id>` for any focused plugin
 * 2. Any other chunk that contains at least one module originating from a
 *    focused plugin's source directory (captures shared chunks)
 * 3. All modules within those chunks, plus all top-level modules matching
 *    the focused plugins' directories
 */
export function filterStatsByFocus(
  jsonStats: Record<string, any>,
  focusPlugins: FocusPluginInfo[],
  log?: ToolingLog
): Record<string, any> {
  const focusChunkNames = new Set(focusPlugins.map((p) => `plugin-${p.id}`));
  // Ensure directory paths end with / so /plugins/dashboard/ doesn't match
  // /plugins/dashboardEnhanced/
  const focusDirs = focusPlugins.map((p) =>
    p.contextDir.endsWith('/') ? p.contextDir : `${p.contextDir}/`
  );

  const isModuleFromFocusedPlugin = (mod: any): boolean => {
    const id = mod.identifier ?? mod.name ?? '';
    return focusDirs.some((dir) => id.includes(dir));
  };

  const chunks: any[] = jsonStats.chunks ?? [];
  const focusedChunks: any[] = [];

  for (const chunk of chunks) {
    const names: string[] = chunk.names ?? [];
    const isNamedFocus = names.some((n: string) => focusChunkNames.has(n));

    if (isNamedFocus) {
      focusedChunks.push(chunk);
      continue;
    }

    // Check if any module in this chunk belongs to a focused plugin
    const chunkModules: any[] = chunk.modules ?? [];
    if (chunkModules.some(isModuleFromFocusedPlugin)) {
      focusedChunks.push(chunk);
    }
  }

  // Collect assets from focused chunks
  const focusedChunkAssets = new Set<string>();
  for (const chunk of focusedChunks) {
    for (const file of chunk.files ?? []) {
      focusedChunkAssets.add(file);
    }
  }

  // Collect modules: from chunk.modules (RSPack-style) and top-level (webpack-style)
  const seenModuleKeys = new Set<string>();
  const focusedModules: any[] = [];

  const addModule = (mod: any) => {
    const key = mod.identifier ?? mod.name ?? JSON.stringify(mod);
    if (!seenModuleKeys.has(key)) {
      seenModuleKeys.add(key);
      focusedModules.push(mod);
    }
  };

  for (const chunk of focusedChunks) {
    for (const mod of chunk.modules ?? []) {
      addModule(mod);
    }
  }

  // Also check top-level modules (webpack-style) for focused chunk IDs
  const topModules: any[] = jsonStats.modules ?? [];
  if (topModules.length > 0) {
    const focusedChunkIds = new Set(
      focusedChunks.map((c: any) => c.id).filter((id: any) => id !== undefined)
    );
    for (const mod of topModules) {
      const moduleChunks: Array<string | number> = mod.chunks ?? [];
      if (moduleChunks.some((cid) => focusedChunkIds.has(cid)) || isModuleFromFocusedPlugin(mod)) {
        addModule(mod);
      }
    }
  }

  const assets: any[] = jsonStats.assets ?? [];
  const focusedAssets = assets.filter((a: any) => focusedChunkAssets.has(a.name));

  log?.info(
    `Profile focus: ${focusedChunks.length} chunks, ${focusedModules.length} modules, ` +
      `${focusedAssets.length} assets (from ${focusPlugins.map((p) => p.id).join(', ')})`
  );

  return {
    ...jsonStats,
    chunks: focusedChunks,
    modules: focusedModules,
    assets: focusedAssets,
  };
}

/**
 * Plugin to emit stats.json file for bundle analysis.
 * Used when profiling is enabled.
 *
 * Uses SYNCHRONOUS file writing to ensure stats are written before process exits.
 */
export class EmitStatsPlugin {
  constructor(
    private readonly outputDir: string,
    private readonly log?: ToolingLog,
    private readonly focusPlugins?: FocusPluginInfo[]
  ) {}

  apply(compiler: Compiler) {
    compiler.hooks.afterDone.tap('EmitStatsPlugin', (stats) => {
      const statsPath = Path.resolve(this.outputDir, STATS_FILENAME);

      this.log?.info('Generating stats.json for bundle analysis...');

      try {
        if (!Fs.existsSync(this.outputDir)) {
          Fs.mkdirSync(this.outputDir, { recursive: true });
        }

        const hasFocus = this.focusPlugins && this.focusPlugins.length > 0;

        const statsOptions = hasFocus
          ? {
              all: false,
              hash: true,
              version: true,
              timings: true,
              assets: true,
              chunks: true,
              chunkGroups: true,
              entrypoints: true,
              modules: true,
              reasons: false,
              chunkModules: true,
            }
          : {
              all: false,
              hash: true,
              version: true,
              timings: true,
              assets: true,
              chunks: true,
              chunkGroups: true,
              entrypoints: true,
              modules: false,
              reasons: false,
              chunkModules: false,
            };

        let jsonStats = stats.toJson(statsOptions) as Record<string, any>;

        if (hasFocus) {
          jsonStats = filterStatsByFocus(jsonStats, this.focusPlugins!, this.log);
        }

        EmitStatsPlugin.writeStatsSync(statsPath, jsonStats);

        const fileSize = Fs.statSync(statsPath).size;
        this.log?.info(`Stats written to ${statsPath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
      } catch (err: any) {
        this.log?.error(`Failed to generate stats: ${err.message}`);
      }
    });
  }

  /**
   * Write stats JSON to disk synchronously, key by key, to avoid hitting
   * the JS string length limit with very large stats objects.
   */
  static writeStatsSync(statsPath: string, jsonStats: Record<string, any>): void {
    const fd = Fs.openSync(statsPath, 'w');
    try {
      Fs.writeSync(fd, '{');

      const keys = Object.keys(jsonStats).filter((key) => (jsonStats as any)[key] !== undefined);

      let first = true;
      keys.forEach((key) => {
        const value = (jsonStats as any)[key];

        try {
          const jsonValue = JSON.stringify(value);
          if (jsonValue !== undefined) {
            Fs.writeSync(fd, `${first ? '' : ','}\n  "${key}": ${jsonValue}`);
            first = false;
          }
        } catch {
          // Skip values that can't be stringified (circular refs, etc.)
        }
      });

      Fs.writeSync(fd, '\n}\n');
    } finally {
      Fs.closeSync(fd);
    }
  }
}
