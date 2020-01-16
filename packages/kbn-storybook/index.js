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

const fs = require('fs');
const { join } = require('path');
const Rx = require('rxjs');
const { first } = require('rxjs/operators');
const storybook = require('@storybook/react/standalone');
const { run } = require('@kbn/dev-utils');
const { generateStorybookEntry } = require('./lib/storybook_entry');
const { REPO_ROOT, CURRENT_CONFIG } = require('./lib/constants');
const { buildDll } = require('./lib/dll');

exports.runStorybookCli = config => {
  const { name, storyGlobs } = config;
  run(
    async ({ flags, log, procRunner }) => {
      log.debug('Global config:\n', require('./lib/constants'));

      const currentConfig = JSON.stringify(config, null, 2);
      const currentConfigDir = join(CURRENT_CONFIG, '..');
      await fs.promises.mkdir(currentConfigDir, { recursive: true });
      log.debug('Writing currentConfig:\n', CURRENT_CONFIG + '\n', currentConfig);
      await fs.promises.writeFile(CURRENT_CONFIG, `exports.currentConfig = ${currentConfig};`);

      await buildDll({
        rebuildDll: flags.rebuildDll,
        log,
        procRunner,
      });

      // Build sass and continue when initial build complete
      await procRunner.run('watch sass', {
        cmd: process.execPath,
        args: ['scripts/build_sass', '--watch'],
        cwd: REPO_ROOT,
        wait: /scss bundles created/,
      });

      const subj = new Rx.ReplaySubject(1);
      generateStorybookEntry({ log, storyGlobs }).subscribe(subj);

      await subj.pipe(first()).toPromise();

      await Promise.all([
        // route errors
        subj.toPromise(),

        new Promise(() => {
          // storybook never completes, so neither will this promise
          const configDir = join(__dirname, 'storybook_config');
          log.debug('Config dir:', configDir);
          storybook({
            mode: 'dev',
            port: 9001,
            configDir,
          });
        }),
      ]);
    },
    {
      flags: {
        boolean: ['rebuildDll'],
      },
      description: `
        Run the storybook examples for ${name}
      `,
    }
  );
};
