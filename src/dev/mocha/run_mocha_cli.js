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

import { resolve } from 'path';

import getopts from 'getopts';
import globby from 'globby';

export function runMochaCli() {
  const opts = getopts(process.argv.slice(2), {
    alias: {
      t: 'timeout',
    },
    boolean: [
      'no-timeouts'
    ],
  });

  const runInBand = (
    process.execArgv.includes('--inspect') ||
    process.execArgv.includes('--inspect-brk')
  );

  // ensure that mocha exits when test have completed
  process.argv.push('--exit');

  // check that we aren't leaking any globals
  process.argv.push('--check-leaks');
  // prevent globals injected from canvas plugins from triggering leak check
  process.argv.push('--globals', '__core-js_shared__,core,_, ');

  // ensure that mocha requires the setup_node_env script
  process.argv.push('--require', require.resolve('../../setup_node_env'));

  // set default test timeout
  if (opts.timeout == null && !opts['no-timeouts']) {
    if (runInBand) {
      process.argv.push('--no-timeouts');
    } else {
      process.argv.push('--timeout', '10000');
    }
  }

  // set default slow timeout
  if (opts.slow == null) {
    process.argv.push('--slow', '5000');
  }

  // set default reporter
  if (opts.reporter == null) {
    process.argv.push('--reporter', require.resolve('./server_junit_reporter'));
  }

  // set default test files
  if (!opts._.length) {
    globby.sync([
      'src/**/__tests__/**/*.js',
      'packages/elastic-datemath/test/**/*.js',
      'packages/kbn-dev-utils/src/**/__tests__/**/*.js',
      'packages/kbn-es-query/src/**/__tests__/**/*.js',
      'tasks/**/__tests__/**/*.js',
    ], {
      cwd: resolve(__dirname, '../../..'),
      onlyFiles: true,
      absolute: true,
      ignore: [
        '**/__tests__/fixtures/**',
        'src/**/public/**',
        '**/_*.js'
      ]
    }).forEach(file => {
      process.argv.push(file);
    });
  }

  if (runInBand) {
    require('mocha/bin/_mocha');
  } else {
    require('mocha/bin/mocha');
  }
}
