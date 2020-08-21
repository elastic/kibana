/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Fs from 'fs';
import Path from 'path';
import { promisify } from 'util';

import { REPO_ROOT } from '@kbn/dev-utils';
import { OptimizerConfig, runOptimizer, logOptimizerState } from '@kbn/optimizer';

import { BuildContext } from '../build_context';

const asyncRename = promisify(Fs.rename);

export async function optimize({ log, plugin, sourceDir, buildDir }: BuildContext) {
  if (!plugin.manifest.ui) {
    return;
  }

  log.info('running @kbn/optimizer');
  log.indent(2);

  // build bundles into target
  const config = OptimizerConfig.create({
    repoRoot: REPO_ROOT,
    pluginPaths: [sourceDir],
    cache: false,
    dist: true,
    pluginScanDirs: [],
  });

  await runOptimizer(config).pipe(logOptimizerState(log, config)).toPromise();

  // move target into buildDir
  await asyncRename(Path.resolve(sourceDir, 'target'), Path.resolve(buildDir, 'target'));
  log.indent(-2);
}
