/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { run } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

import { OptimizerConfig } from '../optimizer';
import { parseStats, inAnyEntryChunk } from './parse_stats';

export async function runFindBabelHelpersInEntryBundlesCli() {
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

        for (const { userRequest } of module.reasons) {
          if (userRequest.startsWith('@babel/runtime')) {
            imports.add(userRequest);
          }
        }
      }
    }

    log.success('found', imports.size, '@babel/runtime* imports in entry bundles');
    log.write(
      Array.from(imports, (i) => `'${i}',`)
        .sort()
        .join('\n')
    );
  });
}
