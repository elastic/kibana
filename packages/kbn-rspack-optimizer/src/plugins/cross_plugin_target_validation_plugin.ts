/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Compiler } from '@rspack/core';
import { parseKbnImportReq } from '@kbn/repo-packages';
import type { PluginEntry } from '../types';

interface CrossPluginViolation {
  issuer: string;
  request: string;
  target: string;
  remote: { pluginId: string; targets: string[] };
}

/**
 * Dist-only validation plugin that detects undeclared cross-plugin import
 * targets within the browser compilation graph. Uses the same
 * `normalModuleFactory` hook pattern as the legacy `BundleRemotesPlugin`.
 *
 * In the single compile, all in-repo cross-plugin imports resolve via normal
 * module resolution, so they succeed even without `extraPublicDirs`
 * registration. This means transitive chains like:
 *
 *   public/foo.ts -> (same plugin) common/bar.ts -> @kbn/other-plugin/common/x
 *
 * silently work in-repo but break for external plugins (which rely on
 * `__kbnBundles__`). This plugin surfaces those undeclared targets as
 * errors during dist builds so developers can fix them before shipping.
 *
 * @see packages/kbn-optimizer/src/worker/bundle_remotes_plugin.ts (legacy)
 * @see packages/kbn-rspack-optimizer/src/config/create_external_plugin_config.ts (external)
 */
export class CrossPluginTargetValidationPlugin {
  private pluginTargets: Map<string, { pluginId: string; targets: string[] }>;
  private pluginContextDirs: Array<{ contextDir: string; pkgId: string }>;
  private violations: CrossPluginViolation[] = [];

  constructor(plugins: PluginEntry[]) {
    this.pluginTargets = new Map();
    this.pluginContextDirs = [];
    for (const plugin of plugins) {
      this.pluginTargets.set(plugin.pkgId, {
        pluginId: plugin.id,
        targets: plugin.targets,
      });
      this.pluginContextDirs.push({ contextDir: plugin.contextDir, pkgId: plugin.pkgId });
    }
    this.pluginContextDirs.sort((a, b) => b.contextDir.length - a.contextDir.length);
  }

  private getOwnerPkgId(dirPath: string): string | undefined {
    for (const { contextDir, pkgId } of this.pluginContextDirs) {
      if (dirPath === contextDir || dirPath.startsWith(contextDir + '/')) {
        return pkgId;
      }
    }
    return undefined;
  }

  apply(compiler: Compiler) {
    compiler.hooks.compile.tap('CrossPluginTargetValidationPlugin', (compilationParams: any) => {
      this.violations = [];

      compilationParams.normalModuleFactory.hooks.beforeResolve.tapAsync(
        'CrossPluginTargetValidationPlugin',
        (
          data: { request: string; context: string; contextInfo: { issuer: string } },
          callback: (err?: Error | null, result?: false | void) => void
        ) => {
          const { request } = data;
          if (!request) return callback();

          if (request.endsWith('.json') || request.endsWith('?raw')) return callback();

          const parsed = parseKbnImportReq(request);
          if (!parsed || !parsed.target) return callback();

          const ownerPkgId = this.getOwnerPkgId(data.context);
          if (!ownerPkgId || parsed.pkgId === ownerPkgId) return callback();

          const remote = this.pluginTargets.get(parsed.pkgId);
          if (!remote) return callback();

          const targetMatches = remote.targets.some(
            (t) => parsed.target === t || parsed.target.startsWith(t + '/')
          );
          if (!targetMatches) {
            this.violations.push({
              issuer: data.contextInfo?.issuer || data.context,
              request,
              target: parsed.target,
              remote,
            });
          }

          callback();
        }
      );
    });

    compiler.hooks.afterCompile.tapAsync(
      'CrossPluginTargetValidationPlugin',
      (_compilation, callback) => {
        if (this.violations.length === 0) return callback();

        const details = this.violations
          .map((v) => {
            const targetDir = v.target.split('/')[0];
            return (
              `  [${v.remote.pluginId}] undeclared target "${v.target}"\n` +
              `    File:    ${v.issuer}\n` +
              `    Import:  ${v.request}\n` +
              `    Allowed: [${v.remote.targets.join(', ')}]\n\n` +
              `    How to fix:\n` +
              `      Option 1: Add "${targetDir}" to "extraPublicDirs" in the ` +
              `target plugin's kibana.jsonc\n` +
              `      Option 2: Move the shared code to a @kbn/ package\n` +
              `      Option 3: Break the transitive chain from public/ code\n`
            );
          })
          .join('\n');

        callback(
          new Error(
            `\n[CrossPluginTargetValidation] ${this.violations.length} undeclared cross-plugin ` +
              `import target(s) detected in the browser bundle.\n\n` +
              `These imports target directories that are not declared in extraPublicDirs,\n` +
              `so they won't be registered in __kbnBundles__ for external plugin consumers.\n\n` +
              details
          )
        );
      }
    );
  }
}
