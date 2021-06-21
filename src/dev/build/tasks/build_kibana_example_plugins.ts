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

    // causes build errors
    const exclude = [
      'bfetch_explorer',
      'dashboard_embeddable_examples',
      'embeddable_examples',
      'embeddable_explorer',
      'search_examples',
      'state_containers_examples',
      'ui_action_examples',
      'ui_actions_explorer',
      'url_generators_examples',
      'url_generators_explorer',
    ];

    const folders = Fs.readdirSync(examplesDir, { withFileTypes: true })
      .filter((f) => f.isDirectory())
      .filter((f) => !exclude.includes(f.name))
      .map((f) => Path.resolve(REPO_ROOT, 'examples', f.name));

    for (const examplePlugin of folders) {
      log.info(`Building ${examplePlugin}`);
      await exec(log, 'node', args, {
        cwd: examplePlugin,
        level: 'info',
      });
    }

    const pluginsDir = config.resolveFromTarget('example_plugins');
    await mkdirp(pluginsDir);
    await copyAll(examplesDir, pluginsDir, {
      select: ['*/build/*.zip'],
    });
  },
};
