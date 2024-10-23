/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runBazel } from '@kbn/bazel-runner';
import { TaskContext } from '../task_context';

export async function buildBazelPackages({ log, dist }: TaskContext) {
  log.info('run bazel and build required artifacts for the optimizer');

  try {
    await runBazel(
      [
        'build',
        '//packages/kbn-ui-shared-deps-npm:shared_built_assets',
        '//packages/kbn-ui-shared-deps-src:shared_built_assets',
        '//packages/kbn-monaco:target_workers',
        '--show_result=1',
      ].concat(dist ? [`--define=dist=true`] : []),
      {
        logPrefix: ' │     ',
        quiet: true,
      }
    );

    log.success('bazel run successfully and artifacts were created');
  } catch (e) {
    log.error(`bazel run failed: ${e}`);
    process.exit(1);
  }
}
