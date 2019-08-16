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
import { promises as fsP } from 'fs';
import { snakeCase } from 'lodash';
import * as del from 'del';

const ROOT_DIR = resolve(__dirname, '../../../');
const oneMinute = 60000;

describe(`running the plugin-generator via 'node scripts/generate_plugin.js plugin-name'`, () => {
  const pluginName = 'ispec-plugin';
  const snakeCased = snakeCase(pluginName);
  const generatedPath = resolve(ROOT_DIR, `plugins/${snakeCased}`);
  const collect = xs => data => xs.push(data + ''); // Coerce from Buffer to String

  // eslint-disable-next-line no-undef
  beforeAll(() => {
    // eslint-disable-next-line no-undef
    jest.setTimeout(oneMinute * 3);
  });

  // eslint-disable-next-line no-undef
  beforeAll(done => {
    const create = spawn(process.execPath, ['scripts/generate_plugin.js', pluginName], {
      cwd: ROOT_DIR,
    });
    create.stdout.on('data', () => {
      create.stdin.write('\n');
    });
    create.on('close', done);
  });

  // eslint-disable-next-line no-undef
  afterAll(() => {
    del.sync(generatedPath, { force: true });
  });

  it(`should succeed on creating a plugin in a directory named 'plugins/${snakeCased}`, async () => {
    const stats = await fsP.stat(generatedPath);
    // eslint-disable-next-line no-undef
    expect(stats.isDirectory()).toBe(true);
  });

  describe(`and then running 'yarn lint' in the plugin's root dir`, () => {
    const stdErrs = [];
    const stdOuts = [];
    let yarnLint;

    // eslint-disable-next-line no-undef
    beforeAll(done => {
      yarnLint = spawn('yarn', ['lint'], { cwd: generatedPath });
      yarnLint.stderr.on('data', collect(stdErrs));
      yarnLint.stdout.on('data', collect(stdOuts));
      yarnLint.on('close', () => {
        done(); // TODO: Why isnt the handler running point-free?
      });
    }, oneMinute * 3);

    it(`should not show the '"@kbn/eslint/no-restricted-paths" is invalid' msg on stderr`, () => {
      // eslint-disable-next-line no-undef
      expect(stdErrs.join('\n')).not.toContain('"@kbn/eslint/no-restricted-paths" is invalid');
    });

    it(`should not show the 'import/no-unresolved' msg on stdout`, () => {
      // eslint-disable-next-line no-undef
      expect(stdOuts.join('\n')).not.toContain('import/no-unresolved');
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
        // eslint-disable-next-line no-undef
        expect(outData.join('\n')).toContain(helpMsg);
        done();
      });
    });
  });
});
