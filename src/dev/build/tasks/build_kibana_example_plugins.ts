/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import { REPO_ROOT } from '@kbn/utils';
import { exec, mkdirp, copyAll, Task } from '../lib';

export const BuildKibanaExamplePlugins: Task = {
  description: 'Building distributable versions of Kibana example plugins',
  async run(config, log, build) {
    const examplesDir = Path.resolve(REPO_ROOT, 'examples');
    const args = [
      '../../scripts/plugin_helpers',
      'build',
      `--kibana-version=${config.getBuildVersion()}`,
    ];

    const folders = Fs.readdirSync(examplesDir, { withFileTypes: true })
      .filter((f) => f.isDirectory())
      .map((f) => Path.resolve(REPO_ROOT, 'examples', f.name));

    for (const examplePlugin of folders) {
      try {
        Fs.accessSync(Path.join(examplePlugin, 'kibana.json'), Fs.constants.R_OK);
        log.info(`Building ${examplePlugin}`);
        await exec(log, 'node', args, {
          cwd: examplePlugin,
          level: 'info',
        });
      } catch (e) {
        log.info(`Skipping ${examplePlugin}, no kibana.json`);
      }
    }

    const pluginsDir = config.resolveFromTarget('example_plugins');
    await mkdirp(pluginsDir);
    await copyAll(examplesDir, pluginsDir, {
      select: ['*/build/*.zip'],
    });
  },
};
