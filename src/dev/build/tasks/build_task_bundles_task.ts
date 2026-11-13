/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdir } from 'fs/promises';
import { buildTaskBundle, getTaskBundleEntries, writeManifest } from '../../task_bundles/build';
import type { Task } from '../lib';

/**
 * Bundles every task type module declared in a plugin's `kibana.jsonc` (`plugin.taskTypes`) into
 * `task_bundles/`, with a manifest of the task type each bundle serves. Kibana starts them when
 * `xpack.task_manager.task_execution.mode` is `child_process`.
 */
export const BuildTaskBundles: Task = {
  description: 'Bundling task types to run in their own processes',

  async run(config, log, build) {
    const outDir = build.resolvePath('task_bundles');
    const version = config.getBuildVersion();

    await mkdir(outDir, { recursive: true });

    const results = await Promise.all(
      getTaskBundleEntries().map((entry: unknown) =>
        buildTaskBundle({ entry, outDir, kibanaVersion: version, sourcemap: false })
      )
    );
    writeManifest(results, outDir, version);
    log.info(`Bundled ${results.length} task types into ${outDir}`);
  },
};
