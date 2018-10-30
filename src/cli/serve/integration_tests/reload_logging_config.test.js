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
import { writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import { safeDump } from 'js-yaml';
import es from 'event-stream';
import { getConfigFromFiles } from '../../../core/server/config/read_config';

const testConfigFile = follow('__fixtures__/reload_logging_config/kibana.test.yml');
const kibanaPath = follow('../../../../scripts/kibana.js');

function follow(file) {
  return relative(process.cwd(), resolve(__dirname, file));
}

function setLoggingJson(enabled) {
  const conf = getConfigFromFiles([testConfigFile]);
  conf.logging = conf.logging || {};
  conf.logging.json = enabled;

  const yaml = safeDump(conf);

  writeFileSync(testConfigFile, yaml);
}

describe('Server logging configuration', function () {
  let child;
  let isJson;

  beforeEach(() => {
    isJson = true;
    setLoggingJson(true);
  });

  afterEach(() => {
    isJson = true;
    setLoggingJson(true);

    if (child !== undefined) {
      child.kill();
      child = undefined;
    }
  });

  const isWindows = /^win/.test(process.platform);
  if (isWindows) {
    it('SIGHUP is not a feature of Windows.', () => {
      // nothing to do for Windows
    });
  } else {
    it('should be reloadable via SIGHUP process signaling', function (done) {
      expect.assertions(3);

      child = spawn('node', [kibanaPath, '--config', testConfigFile]);

      child.on('error', err => {
        done(new Error(`error in child process while attempting to reload config. ${err.stack || err.message || err}`));
      });

      let sawJson = false;
      let sawNonjson = false;

      child.on('exit', _code => {
        const code = _code === null ? 0 : _code;

        expect(code).toEqual(0);
        expect(sawJson).toEqual(true);
        expect(sawNonjson).toEqual(true);
        done();
      });

      child.stdout
        .pipe(es.split())
        .pipe(es.mapSync(line => {
          if (!line) {
            // skip empty lines
            return;
          }

          if (isJson) {
            const data = JSON.parse(line);
            sawJson = true;

            if (data.tags.includes('listening')) {
              switchToPlainTextLog();
            }
          } else if (line.startsWith('{')) {
            // We have told Kibana to stop logging json, but it hasn't completed
            // the switch yet, so we ignore before switching over.
          } else {
            // Kibana has successfully stopped logging json, so kill the server.

            sawNonjson = true;

            child.kill();
            child = undefined;
          }
        }));

      function switchToPlainTextLog() {
        isJson = false;
        setLoggingJson(false);

        // Reload logging config. We give it a little bit of time to just make
        // sure the process sighup handler is registered.
        setTimeout(() => {
          child.kill('SIGHUP');
        }, 100);
      }
    }, 60000);
  }
});
