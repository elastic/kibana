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
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';

import { safeDump } from 'js-yaml';
import es from 'event-stream';
import stripAnsi from 'strip-ansi';
import { getConfigFromFiles } from '../../../core/server/config';

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

const prepareJson = obj => ({
  ...obj,
  pid: '## PID ##',
  '@timestamp': '## @timestamp ##'
});

const prepareLogLine = str =>
  stripAnsi(str.replace(
    /\[\d{2}:\d{2}:\d{2}.\d{3}\]/,
    '[## timestamp ##]'
  ));

describe.skip('Server logging configuration', function () {
  let child;
  let isJson;

  beforeEach(() => {
    isJson = true;
    setLoggingJson(true);

    mkdirp.sync(tempDir);
  });

  afterEach(() => {
    isJson = true;
    setLoggingJson(true);

    if (child !== undefined) {
      child.kill();
      child = undefined;
    }

    rimraf.sync(tempDir);
  });

  const isWindows = /^win/.test(process.platform);
  if (isWindows) {
    it('SIGHUP is not a feature of Windows.', () => {
      // nothing to do for Windows
    });
  } else {
    it('should be reloadable via SIGHUP process signaling', function (done) {
      expect.assertions(1);

      child = spawn('node', [kibanaPath, '--config', testConfigFile]);

      child.on('error', err => {
        done(new Error(`error in child process while attempting to reload config. ${err.stack || err.message || err}`));
      });

      const lines = [];

      child.on('exit', _code => {
        const code = _code === null ? 0 : _code;

        expect({ code, lines }).toMatchSnapshot();
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
            lines.push(prepareJson(data));

            if (data.tags.includes('listening')) {
              switchToPlainTextLog();
            }
          } else if (line.startsWith('{')) {
            // We have told Kibana to stop logging json, but it hasn't completed
            // the switch yet, so we verify the messages that are logged while
            // switching over.

            const data = JSON.parse(line);
            lines.push(prepareJson(data));
          } else {
            // Kibana has successfully stopped logging json, so we verify the
            // log line and kill the server.

            lines.push(prepareLogLine(line));

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
    }, minute);
  }

  it.skip('should recreate file handler on SIGHUP', function (done) {
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
      '--logging.dest', logPath,
      '--plugins.initialize', 'false',
      '--logging.json', 'false'
    ]);

    watchFileUntil(logPath, /Server running at/, 2 * minute)
      .then(() => {
        // once the server is running, archive the log file and issue SIGHUP
        fs.renameSync(logPath, logPathArchived);
        child.kill('SIGHUP');
      })
      .then(() => watchFileUntil(logPath, /Reloaded logging configuration due to SIGHUP/, 10 * second))
      .then(contents => {
        const lines = contents.toString().split('\n');
        // should be the first and only new line of the log file
        expect(lines).toHaveLength(2);
        child.kill();
      })
      .then(done, done);

  }, 3 * minute);
});
