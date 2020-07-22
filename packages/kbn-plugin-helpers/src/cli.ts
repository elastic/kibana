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

import Fs from 'fs';
import Path from 'path';

import program from 'commander';

import { createCommanderAction } from './lib/commander_action';
import { docs } from './lib/docs';
import { enableCollectingUnknownOptions } from './lib/enable_collecting_unknown_options';

const pkg = JSON.parse(Fs.readFileSync(Path.resolve(__dirname, '../package.json'), 'utf8'));
program.version(pkg.version);

enableCollectingUnknownOptions(
  program
    .command('start')
    .description('Start kibana and have it include this plugin')
    .on('--help', docs('start'))
    .action(
      createCommanderAction('start', (command) => ({
        flags: command.unknownOptions,
      }))
    )
);

program
  .command('build [files...]')
  .description('Build a distributable archive')
  .on('--help', docs('build'))
  .option('--skip-archive', "Don't create the zip file, leave the build path alone")
  .option(
    '-d, --build-destination <path>',
    'Target path for the build output, absolute or relative to the plugin root'
  )
  .option('-b, --build-version <version>', 'Version for the build output')
  .option('-k, --kibana-version <version>', 'Kibana version for the build output')
  .action(
    createCommanderAction('build', (command, files) => ({
      buildDestination: command.buildDestination,
      buildVersion: command.buildVersion,
      kibanaVersion: command.kibanaVersion,
      skipArchive: Boolean(command.skipArchive),
      files,
    }))
  );

program
  .command('test')
  .description('Run the server and browser tests')
  .on('--help', docs('test/all'))
  .action(createCommanderAction('testAll'));

program
  .command('test:karma')
  .description('Run the browser tests in a real web browser')
  .option('--dev', 'Enable dev mode, keeps the test server running')
  .option('-p, --plugins <plugin-ids>', "Manually specify which plugins' test bundles to run")
  .on('--help', docs('test/karma'))
  .action(
    createCommanderAction('testKarma', (command) => ({
      dev: Boolean(command.dev),
      plugins: command.plugins,
    }))
  );

program
  .command('test:mocha [files...]')
  .description('Run the server tests using mocha')
  .on('--help', docs('test/mocha'))
  .action(
    createCommanderAction('testMocha', (command, files) => ({
      files,
    }))
  );

program.parse(process.argv);
