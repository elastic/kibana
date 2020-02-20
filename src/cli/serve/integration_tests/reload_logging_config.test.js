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
import fs from 'fs';
import path from 'path';
import os from 'os';
import del from 'del';

import { safeDump } from 'js-yaml';
import {
  createMapStream,
  createSplitStream,
  createPromiseFromStreams,
} from '../../../legacy/utils/streams';
import { getConfigFromFiles } from '../../../core/server/config/read_config';

const testConfigFile = follow('__fixtures__/reload_logging_config/kibana.test.yml');
const kibanaPath = follow('../../../../scripts/kibana.js');

const second = 1000;
const minute = second * 60;

const tempDir = path.join(os.tmpdir(), 'kbn-reload-test');

function follow(file) {
  return path.relative(process.cwd(), path.resolve(__dirname, file));
}

function setLoggingJson(enabled) {
  const conf = getConfigFromFiles([testConfigFile]);
  conf.logging = conf.logging || {};
  conf.logging.json = enabled;

  const yaml = safeDump(conf);

  fs.writeFileSync(testConfigFile, yaml);
}

describe('Server logging configuration', function() {
  let child;
  let isJson;

  beforeEach(() => {
    isJson = true;
    setLoggingJson(true);

    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    isJson = true;
    setLoggingJson(true);

    if (child !== undefined) {
      child.kill();
      child = undefined;
    }

    del.sync(tempDir, { force: true });
  });

  const isWindows = /^win/.test(process.platform);
  if (isWindows) {
    it('SIGHUP is not a feature of Windows.', () => {
      // nothing to do for Windows
    });
  } else {
    it(
      'should be reloadable via SIGHUP process signaling',
      async function() {
        expect.assertions(3);

        child = spawn(
          process.execPath,
          [kibanaPath, '--config', testConfigFile, '--oss', '--verbose'],
          {
            stdio: 'pipe',
          }
        );

        let sawJson = false;
        let sawNonjson = false;

        const [exitCode] = await Promise.all([
          Promise.race([
            new Promise(r => child.once('exit', r)).then(code => (code === null ? 0 : code)),

            new Promise(r => child.once('error', r)).then(err => {
              throw new Error(
                `error in child process while attempting to reload config. ${err.stack ||
                  err.message ||
                  err}`
              );
            }),
          ]),

          createPromiseFromStreams([
            child.stdout,
            createSplitStream('\n'),
            createMapStream(async line => {
              if (!line) {
                // skip empty lines
                return;
              }

              if (isJson) {
                const data = JSON.parse(line);
                sawJson = true;

                // We know the sighup handler will be registered before
                // root.setup() is called
                if (data.message.includes('setting up root')) {
                  isJson = false;
                  setLoggingJson(false);

                  // Reload logging config. We give it a little bit of time to just make
                  // sure the process sighup handler is registered.
                  await new Promise(r => setTimeout(r, 100));
                  child.kill('SIGHUP');
                }
              } else if (line.startsWith('{')) {
                // We have told Kibana to stop logging json, but it hasn't completed
                // the switch yet, so we ignore before switching over.
              } else {
                // Kibana has successfully stopped logging json, so kill the server.
                sawNonjson = true;

                child && child.kill();
                child = undefined;
              }
            }),
          ]),
        ]);

        expect(exitCode).toEqual(0);
        expect(sawJson).toEqual(true);
        expect(sawNonjson).toEqual(true);
      },
      minute
    );

    it(
      'should recreate file handler on SIGHUP',
      function(done) {
        expect.hasAssertions();

        const logPath = path.resolve(tempDir, 'kibana.log');
        const logPathArchived = path.resolve(tempDir, 'kibana_archive.log');

        function watchFileUntil(path, matcher, timeout) {
          return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
              fs.unwatchFile(path);
              reject(`watchFileUntil timed out for "${matcher}"`);
            }, timeout);

            fs.watchFile(path, () => {
              try {
                const contents = fs.readFileSync(path);

                if (matcher.test(contents)) {
                  clearTimeout(timeoutHandle);
                  fs.unwatchFile(path);
                  resolve(contents);
                }
              } catch (e) {
                // noop
              }
            });
          });
        }

        child = spawn(process.execPath, [
          kibanaPath,
          '--oss',
          '--config',
          testConfigFile,
          '--logging.dest',
          logPath,
          '--plugins.initialize',
          'false',
          '--logging.json',
          'false',
          '--verbose',
        ]);

        watchFileUntil(logPath, /starting server/, 2 * minute)
          .then(() => {
            // once the server is running, archive the log file and issue SIGHUP
            fs.renameSync(logPath, logPathArchived);
            child.kill('SIGHUP');
          })
          .then(() =>
            watchFileUntil(logPath, /Reloaded logging configuration due to SIGHUP/, 10 * second)
          )
          .then(contents => {
            const lines = contents.toString().split('\n');
            // should be the first line of the new log file
            expect(lines[0]).toMatch(/Reloaded logging configuration due to SIGHUP/);
            child.kill();
          })
          .then(done, done);
      },
      3 * minute
    );
  }
});
