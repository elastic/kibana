/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { rspack, type Compiler } from '@rspack/core';
import type { SingleCompileConfigOptions } from '../config/create_single_compile_config';
import { discoverPlugins, getPackageMapPath } from '../utils/plugin_discovery';
import { collectPluginEntries, createUnifiedEntry } from '../utils/entry_generation';

/**
 * RSPack plugin that watches for plugin changes (kibana.jsonc files)
 * and triggers a rebuild when plugins are added or removed.
 */
export class PluginWatchPlugin {
  private pluginManifests: string[];
  private options: SingleCompileConfigOptions;
  private wrapperDir: string;
  private lastPluginHash: string = '';
  private hasInitialDiscovery = false;

  constructor(pluginManifests: string[], options: SingleCompileConfigOptions, wrapperDir: string) {
    this.pluginManifests = pluginManifests;
    this.options = options;
    this.wrapperDir = wrapperDir;
  }

  private shouldRediscoverPlugins(compiler: Compiler): boolean {
    if (!this.hasInitialDiscovery) return true;

    const modified = compiler.modifiedFiles;
    const removed = compiler.removedFiles;

    if (!modified && !removed) return true;

    const hasFileWithExtension = (files: ReadonlySet<string> | undefined): boolean => {
      if (!files) return false;
      for (const f of files) {
        if (Path.extname(f) !== '') return true;
      }
      return false;
    };

    // Only directories changed (no files with extensions) -- structural change, trigger discovery
    if (!hasFileWithExtension(modified) && !hasFileWithExtension(removed)) {
      return true;
    }

    const isManifest = (f: string) => f.endsWith('/kibana.jsonc') || f.endsWith('\\kibana.jsonc');
    const isPluginEntry = (f: string) => /[/\\]public[/\\]index\.(?!test\.)[^/\\]+$/.test(f);
    const isPackageMap = (f: string) =>
      f.endsWith('/package-map.json') || f.endsWith('\\package-map.json');

    const isRelevant = (f: string) => isManifest(f) || isPluginEntry(f) || isPackageMap(f);

    if (modified) {
      for (const f of modified) {
        if (isRelevant(f)) return true;
      }
    }
    if (removed) {
      for (const f of removed) {
        if (isRelevant(f)) return true;
      }
    }

    return false;
  }

  apply(compiler: Compiler) {
    compiler.hooks.afterCompile.tap('PluginWatchPlugin', (compilation) => {
      // Watch existing plugin directories for manifest changes
      for (const manifest of this.pluginManifests) {
        compilation.contextDependencies.add(Path.dirname(manifest));
      }

      // Watch package-map.json to detect new/removed plugins
      // (updated by `yarn kbn bootstrap` when plugins are added/removed)
      compilation.fileDependencies.add(getPackageMapPath());
    });

    compiler.hooks.watchRun.tapAsync('PluginWatchPlugin', async (_compiler, callback) => {
      if (!this.shouldRediscoverPlugins(_compiler)) {
        callback();
        return;
      }

      try {
        const currentPlugins = await discoverPlugins({
          repoRoot: this.options.repoRoot,
          examples: this.options.examples || false,
          testPlugins: this.options.testPlugins || false,
        });

        // Collect plugin entries
        const pluginEntries = collectPluginEntries(this.options.repoRoot, currentPlugins);

        const currentHash = rspack.util
          .createHash('xxhash64')
          .update(pluginEntries.map((e) => `${e.id}:${e.path}`).join('\n'), 'utf-8')
          .digest('hex');

        // If plugin list changed, regenerate the unified entry
        if (currentHash !== this.lastPluginHash) {
          const isInitial = this.lastPluginHash === '';
          this.lastPluginHash = currentHash;

          // Regenerate unified entry (will update zone chunks too)
          createUnifiedEntry(this.wrapperDir, this.options.repoRoot, pluginEntries);

          // Update manifest list for watching
          this.pluginManifests = currentPlugins.map((p) => Path.join(p.contextDir, 'kibana.jsonc'));

          if (this.options.log) {
            this.options.log.info(
              `Plugin list changed, regenerating entry (${pluginEntries.length} bundles)`
            );
            if (!isInitial) {
              this.options.log.warning(
                'Browser plugin list changed. Stop and restart the dev server for the changes to take full effect.'
              );
            }
          }
        }

        this.hasInitialDiscovery = true;
        callback();
      } catch (err) {
        callback(err as Error);
      }
    });
  }
}
