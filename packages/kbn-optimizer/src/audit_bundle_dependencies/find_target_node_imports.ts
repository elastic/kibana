/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/utils';

import { OptimizerConfig } from '../optimizer';
import { parseStats } from './parse_stats';

/**
 * Analyzes the bundle dependencies to find any imports using the `@kbn/<package_name>/target_node` build target.
 *
 * We should aim for those packages to be imported using the `@kbn/<package_name>/target_web` build because it's optimized
 * for browser compatibility.
 *
 * This utility also helps identify when code that should only run in the server is leaked into the browser.
 */
export async function runFindTargetNodeImportsCli() {
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
        if (module.name.includes('/target_node/')) {
          const [, cleanName] = /\/((?:kbn-|@kbn\/).+)\/target_node/.exec(module.name) ?? [];
          imports.add(cleanName || module.name);
        }
      }
    }

    log.success('found', imports.size, '@kbn/*/target_node imports in entry bundles and chunks');
    log.write(
      Array.from(imports, (i) => `'${i}',`)
        .sort()
        .join('\n')
    );
  });
}
