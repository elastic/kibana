/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';

import { OptimizerConfig } from '../optimizer';
import { parseStats, inAnyEntryChunk } from './parse_stats';

export async function runFindNodeLibsBrowserPolyfillsInEntryBundlesCli() {
  run(async ({ log }) => {
    const config = OptimizerConfig.create({
      includeCoreBundle: true,
      repoRoot: REPO_ROOT,
    });

    const paths = config.bundles.map((b) => Path.resolve(b.outputDir, 'stats.json'));

    log.info('analyzing', paths.length, 'stats files');
    log.verbose(paths);

    const imports = new Set();
    for (const path of paths) {
      const stats = parseStats(path);

      for (const module of stats.modules) {
        if (!inAnyEntryChunk(stats, module)) {
          continue;
        }

        // Relying on module name instead of actual imports because these are usual polyfills that assume the global
        // Node.js environment when development (i.e.: Buffer doesn't require an import to be used).
        if (module.name.includes('node-libs-browser/node_modules/')) {
          imports.add(module.name);
        }
      }
    }

    log.success('found', imports.size, 'node-libs-browser/* imports in entry bundles');
    log.write(
      Array.from(imports, (i) => `'${i}',`)
        .sort()
        .join('\n')
    );
  });
}
