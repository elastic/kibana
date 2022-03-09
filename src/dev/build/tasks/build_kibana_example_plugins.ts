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
  async run(config, log) {
    const args = [
      Path.resolve(REPO_ROOT, 'scripts/plugin_helpers'),
      'build',
      `--kibana-version=${config.getBuildVersion()}`,
    ];

    const getExampleFolders = (dir: string) => {
      return Fs.readdirSync(dir, { withFileTypes: true })
        .filter((f) => f.isDirectory())
        .map((f) => Path.resolve(dir, f.name));
    };

    // https://github.com/elastic/kibana/issues/127338
    const skipExamples = ['alerting_example'];

    const folders = [
      ...getExampleFolders(Path.resolve(REPO_ROOT, 'examples')),
      ...getExampleFolders(Path.resolve(REPO_ROOT, 'x-pack/examples')),
    ].filter((p) => !skipExamples.includes(Path.basename(p)));

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
    await copyAll(REPO_ROOT, pluginsDir, {
      select: ['examples/*/build/*.zip', 'x-pack/examples/*/build/*.zip'],
    });
  },
};
