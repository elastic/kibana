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
import { stat } from 'fs';
import { snakeCase } from 'lodash';
import del from 'del';
import { withProcRunner, ToolingLog } from '@kbn/dev-utils';
import { createEsTestCluster } from '@kbn/test';
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
    create.stdout.on('data', () => {
      create.stdin.write('\n');
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

  describe(`and then running 'yarn start' in the plugin's root dir`, () => {
    const log = new ToolingLog({ level: 'info', writeTo: process.stdout });
    it(`should result in the spec plugin being initialized on kibana's stdout`, async () => {
      const es = createEsTestCluster({ license: 'basic', log });
      await es.start();
      await withProcRunner(log, async proc => {
        await proc.run('kibana', {
          cwd: generatedPath,
          args: ['start', '--optimize.enabled=false', '--logging.json=false'],
          cmd: 'yarn',
          wait: /ispec_plugin.+Status changed from uninitialized to green - Ready/,
        });
        await proc.stop('kibana');
      });
      await es.stop();
    });
  });

  describe(`and then running 'yarn build' in the plugin's root dir`, () => {
    const stdErrs = [];

    beforeAll(done => {
      const build = spawn('yarn', ['build'], { cwd: generatedPath });
      build.stderr.on('data', collect(stdErrs));
      build.on('close', () => done());
    });

    it(`should result in only having 'warning package.json: No license field' on stderr`, () => {
      expect(stdErrs.join('\n')).toEqual('warning package.json: No license field\n');
    });
  });

  describe(`and then running 'yarn preinstall' in the plugin's root dir`, () => {
    const stdOuts = [];
    const stdErrs = [];

    beforeAll(done => {
      const preinstall = spawn('yarn', ['preinstall'], { cwd: generatedPath });
      preinstall.stderr.on('data', collect(stdErrs));
      preinstall.stdout.on('data', collect(stdOuts));
      preinstall.on('close', () => done());
    });

    it(`should result in only having 'warning package.json: No license field' on stderr`, () => {
      expect(stdErrs.join('\n')).toEqual('warning package.json: No license field\n');
    });
  });

  describe(`and then running 'yarn lint' in the plugin's root dir`, () => {
    it(`should lint w/o errors`, async () => {
      await execa('yarn', ['lint'], { cwd: generatedPath });
    });
  });

  describe(`and then running 'yarn kbn --help'`, () => {
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
    it(`should print out the kbn help msg`, done => {
      const outData = [];
      const kbnHelp = spawn('yarn', ['kbn', '--help'], { cwd: generatedPath });
      kbnHelp.stdout.on('data', collect(outData));
      kbnHelp.on('close', () => {
        expect(outData.join('\n')).toContain(helpMsg);
        done();
      });
    });
  });

  describe(`and then running 'yarn es --help'`, () => {
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
    it(`should print out the es help msg`, done => {
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
