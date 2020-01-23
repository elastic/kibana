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

/* eslint-disable no-restricted-syntax */
import { spawn } from 'child_process';
import { resolve } from 'path';
import util from 'util';
import { stat, readFileSync } from 'fs';
import { snakeCase } from 'lodash';
import del from 'del';
import { withProcRunner, ToolingLog } from '@kbn/dev-utils';
import { createLegacyEsTestCluster } from '@kbn/test';
import execa from 'execa';

const statP = util.promisify(stat);
const ROOT_DIR = resolve(__dirname, '../../../');
const oneMinute = 60000;

describe(`running the plugin-generator via 'node scripts/generate_plugin.js plugin-name' with default config`, () => {
  const pluginName = 'ispec-plugin';
  const snakeCased = snakeCase(pluginName);
  const generatedPath = resolve(ROOT_DIR, `plugins/${snakeCased}`);
  const collect = xs => data => xs.push(data + ''); // Coerce from Buffer to String

  beforeAll(() => {
    jest.setTimeout(oneMinute * 10);
  });

  beforeAll(done => {
    const create = spawn(process.execPath, ['scripts/generate_plugin.js', pluginName], {
      cwd: ROOT_DIR,
    });
    create.stdout.on('data', function selectDefaults() {
      create.stdin.write('\n'); // Generate a plugin with default options.
    });
    create.on('close', done);
  });

  afterAll(() => {
    del.sync(generatedPath, { force: true });
  });

  it(`should succeed on creating a plugin in a directory named 'plugins/${snakeCased}`, async () => {
    const stats = await statP(generatedPath);
    expect(stats.isDirectory()).toBe(true);
  });

  it(`should create an internationalization config file with a blank line appended to satisfy the parser`, async () => {
    // Link to the error that happens when the blank line is not there:
    // https://github.com/elastic/kibana/pull/45044#issuecomment-530092627
    const intlFile = `${generatedPath}/.i18nrc.json`;
    expect(readFileSync(intlFile, 'utf8').endsWith('\n\n')).toBe(true);
  });

  describe(`then running`, () => {
    it(`'yarn test:browser' should exit 0`, async () => {
      await execa('yarn', ['test:browser'], {
        cwd: generatedPath,
        env: {
          DISABLE_JUNIT_REPORTER: '1',
        },
      });
    });

    it(`'yarn test:server' should exit 0`, async () => {
      await execa('yarn', ['test:server'], {
        cwd: generatedPath,
        env: {
          DISABLE_JUNIT_REPORTER: '1',
        },
      });
    });

    it(`'yarn build' should exit 0`, async () => {
      await execa('yarn', ['build'], { cwd: generatedPath });
    });

    describe('with es instance', () => {
      const log = new ToolingLog();

      const es = createLegacyEsTestCluster({ license: 'basic', log });
      beforeAll(es.start);
      afterAll(es.stop);

      it(`'yarn start' should result in the spec plugin being initialized on kibana's stdout`, async () => {
        await withProcRunner(log, async proc => {
          await proc.run('kibana', {
            cmd: 'yarn',
            args: [
              'start',
              '--optimize.enabled=false',
              '--logging.json=false',
              '--migrations.skip=true',
            ],
            cwd: generatedPath,
            wait: /ispec_plugin.+Status changed from uninitialized to green - Ready/,
          });
          await proc.stop('kibana');
        });
      });
    });

    it(`'yarn preinstall' should exit 0`, async () => {
      await execa('yarn', ['preinstall'], { cwd: generatedPath });
    });

    it(`'yarn lint' should exit 0`, async () => {
      await execa('yarn', ['lint'], { cwd: generatedPath });
    });

    it(`'yarn kbn --help' should print out the kbn help msg`, done => {
      const helpMsg = `
usage: kbn <command> [<args>]

By default commands are run for Kibana itself, all packages in the 'packages/'
folder and for all plugins in './plugins' and '../kibana-extra'.

Available commands:

   bootstrap - Install dependencies and crosslink projects
   clean - Remove the node_modules and target directories from all projects.
   run - Run script defined in package.json in each package that contains that script.
   watch - Runs \`kbn:watch\` script for every project.

Global options:

   -e, --exclude          Exclude specified project. Can be specified multiple times to exclude multiple projects, e.g. '-e kibana -e @kbn/pm'.
   -i, --include          Include only specified projects. If left unspecified, it defaults to including all projects.
   --oss                  Do not include the x-pack when running command.
   --skip-kibana-plugins  Filter all plugins in ./plugins and ../kibana-extra when running command.
`;
      const outData = [];
      const kbnHelp = spawn('yarn', ['kbn', '--help'], { cwd: generatedPath });
      kbnHelp.stdout.on('data', collect(outData));
      kbnHelp.on('close', () => {
        expect(outData.join('\n')).toContain(helpMsg);
        done();
      });
    });

    it(`'yarn es --help' should print out the es help msg`, done => {
      const helpMsg = `
usage: es <command> [<args>]

Assists with running Elasticsearch for Kibana development

Available commands:

  snapshot - Downloads and run from a nightly snapshot
  source - Build and run from source
  archive - Install and run from an Elasticsearch tar
  build_snapshots - Build and collect ES snapshots

Global options:

  --help
`;
      const outData = [];
      const kbnHelp = spawn('yarn', ['es', '--help'], { cwd: generatedPath });
      kbnHelp.stdout.on('data', collect(outData));
      kbnHelp.on('close', () => {
        expect(outData.join('\n')).toContain(helpMsg);
        done();
      });
    });
  });
});
