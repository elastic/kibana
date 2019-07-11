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

const { join } = require('path');
const Rx = require('rxjs');
const { first } = require('rxjs/operators');
const storybook = require('@storybook/react/standalone');

require('../../src/setup_node_env');
const { run } = require('../../src/dev/run');

const { generateStorybookEntry } = require('./lib/storybook_entry');
const { REPO_ROOT } = require('./lib/constants');
const { buildDll } = require('./lib/dll');

exports.runStorybookCli = ({ name, exampleGlobs }) => {
  run(
    async ({ flags, log, procRunner }) => {
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
      generateStorybookEntry({ log, exampleGlobs }).subscribe(subj);

      await subj.pipe(first()).toPromise();

      await Promise.all([
        // route errors
        subj.toPromise(),

        new Promise(() => {
          // storybook never completes, so neither will this promise
          const configDir = join(__dirname, 'storybook_config');
          log.info('Config dir:', configDir);
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
