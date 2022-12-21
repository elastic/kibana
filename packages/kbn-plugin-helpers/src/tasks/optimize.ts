/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';
import { promisify } from 'util';

import { REPO_ROOT } from '@kbn/utils';
import { OptimizerConfig, runOptimizer, logOptimizerState } from '@kbn/optimizer';

import { BuildContext } from '../build_context';

const asyncRename = promisify(Fs.rename);

export async function optimize({ log, plugin, sourceDir, buildDir }: BuildContext) {
  if (!plugin.manifest.ui) {
    return;
  }

  log.info('running @kbn/optimizer');
  await log.indent(2, async () => {
    // build bundles into target
    const config = OptimizerConfig.create({
      repoRoot: REPO_ROOT,
      pluginPaths: [sourceDir],
      cache: false,
      dist: true,
      filter: [plugin.manifest.id],
    });

    const target = Path.resolve(sourceDir, 'target');

    await runOptimizer(config).pipe(logOptimizerState(log, config)).toPromise();

    // clean up unnecessary files
    Fs.unlinkSync(Path.resolve(target, 'public/metrics.json'));
    Fs.unlinkSync(Path.resolve(target, 'public/.kbn-optimizer-cache'));

    // move target into buildDir
    await asyncRename(target, Path.resolve(buildDir, 'target'));
  });
}
