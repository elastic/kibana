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

// # Run Jest tests
//
// All args will be forwarded directly to Jest, e.g. to watch tests run:
//
//     node scripts/jest --watch
//
// or to build code coverage:
//
//     node scripts/jest --coverage
//
// See all cli options in https://facebook.github.io/jest/docs/cli.html

var resolve = require('path').resolve;
var relative = require('path').relative;
var existsSync = require('fs').existsSync;
var REPO_ROOT = require('@kbn/dev-utils').REPO_ROOT;

var configPath = process.argv[process.argv.indexOf('--config')];
var cwd = process.env.INIT_CWD || process.cwd();

if (!configPath) {
  var wd = cwd;

  if (!cwd.startsWith(REPO_ROOT)) {
    console.error(`error: Must be called within Kibana repository [${REPO_ROOT}]`);
    process.exit(1);
  }

  configPath = resolve(wd, 'jest.config.js');

  while (!existsSync(configPath)) {
    wd = resolve(wd, '..');
    configPath = resolve(wd, 'jest.config.js');
  }

  process.argv.push('--config', configPath);
  process.argv.push(relative(wd, cwd));

  console.log('$ yarn jest', process.argv.slice(2).join(' '));
}

if (process.env.NODE_ENV == null) {
  process.env.NODE_ENV = 'test';
}

require('jest').run();
