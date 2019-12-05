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

import { spawn } from 'child_process';

import expect from '@kbn/expect';

const RUN_KBN_SERVER_STARTUP = require.resolve('./fixtures/run_kbn_server_startup');
const SETUP_NODE_ENV = require.resolve('../../../../setup_node_env');
const SECOND = 1000;

describe('config/deprecation warnings', function () {
  this.timeout(65 * SECOND);

  let stdio = '';
  let proc = null;

  before(async () => {
    proc = spawn(process.execPath, [
      '-r', SETUP_NODE_ENV,
      RUN_KBN_SERVER_STARTUP
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CREATE_SERVER_OPTS: JSON.stringify({
          logging: {
            quiet: false,
            silent: false
          },
          uiSettings: {
            enabled: true
          }
        })
      }
    });

    // Either time out in 60 seconds, or resolve once the line is in our buffer
    return Promise.race([
      new Promise((resolve) => setTimeout(resolve, 60 * SECOND)),
      new Promise((resolve, reject) => {
        proc.stdout.on('data', (chunk) => {
          stdio += chunk.toString('utf8');
          if (chunk.toString('utf8').includes('deprecation')) {
            resolve();
          }
        });

        proc.stderr.on('data', (chunk) => {
          stdio += chunk.toString('utf8');
          if (chunk.toString('utf8').includes('deprecation')) {
            resolve();
          }
        });

        proc.on('exit', (code) => {
          proc = null;
          if (code > 0) {
            reject(new Error(`Kibana server exited with ${code} -- stdout:\n\n${stdio}\n`));
          } else {
            resolve();
          }
        });
      })
    ]);
  });

  after(() => {
    if (proc) {
      proc.kill('SIGKILL');
    }
  });

  it('logs deprecation warnings when using outdated config', async () => {
    const deprecationLines = stdio
      .split('\n')
      .map(json => {
        try {
          // in dev mode kibana might log things like node.js warnings which
          // are not JSON, ignore the lines that don't parse as JSON
          return JSON.parse(json);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean)
      .filter(line =>
        line.type === 'log' &&
        line.tags.includes('deprecation') &&
        line.tags.includes('warning')
      );

    try {
      expect(deprecationLines).to.have.length(1);
      expect(deprecationLines[0]).to.have.property('message', 'uiSettings.enabled is deprecated and is no longer used');
    } catch (error) {
      throw new Error(`Expected stdio to include deprecation message about uiSettings.enabled\n\nstdio:\n${stdio}\n\n`);
    }
  });
});
