/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import NormalizePath from 'normalize-path';
import webpack from 'webpack';
import { Minimatch } from 'minimatch';
import { Bundle } from '../common';

export class BundleRemoteUsedExportsPlugin {
  constructor(private readonly bundle: Bundle) {}
  apply(compiler: webpack.Compiler) {
    const buildPublicDirsPatterns = () => {
      const targets = this.bundle.remoteInfo.targets;
      const extensions = '.{js,ts,tsx,json}';
      const builtPattern = !targets.length
        ? 'public'
        : targets.length === 1
        ? targets[0]
        : `{${targets}}`;
      return [`**/${builtPattern}/index${extensions}`, `**/${builtPattern}${extensions}`];
    };

    const publicDirsPatterns = buildPublicDirsPatterns();
    const KbnPluginMainEntryGlob = new Minimatch(publicDirsPatterns[0]);
    const KbnPluginExtraFileEntryGlob = new Minimatch(publicDirsPatterns[1]);

    compiler.hooks.compilation.tap('MarkExportsAsUsedPlugin', (compilation) => {
      const moduleGraph = compilation.moduleGraph;
      compilation.hooks.optimizeDependencies.tap('MarkExportsAsUsedPlugin', (modules) => {
        Array.from(modules).forEach((module: any) => {
          if (!module.resource) {
            return;
          }

          const normalizedModuleResource = NormalizePath(module.resource);
          if (
            KbnPluginMainEntryGlob.match(normalizedModuleResource) ||
            KbnPluginExtraFileEntryGlob.match(normalizedModuleResource)
          ) {
            // Get all exports of the module
            const exportsInfo = moduleGraph.getExportsInfo(module);

            // If the module uses export *, mark it as used in unknown way
            if (module.buildMeta && module.buildMeta.exportsType === 'namespace') {
              // @ts-ignore
              moduleGraph.getExportsInfo(module).setAllKnownExportsUsed();
              // @ts-ignore
              moduleGraph.getExportsInfo(module).setUsedInUnknownWay();
              moduleGraph.addExtraReason(
                module,
                `BundleRemoteUsedExportsPlugin/namespace#=>${module.resource}`
              );
            } else {
              Array.from(exportsInfo.exports).forEach((exportInfo) => {
                if (exportInfo.name) {
                  moduleGraph.getExportsInfo(module).setUsedInUnknownWay(exportInfo.name);
                  moduleGraph.addExtraReason(
                    module,
                    `BundleRemoteUsedExportsPlugin/${exportInfo.name}#=>${module.resource}`
                  );
                }
              });
            }
          }
        });
      });
    });
  }
}
