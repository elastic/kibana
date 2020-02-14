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

import Child from 'child_process';
import Fs from 'fs';
import Path from 'path';
import Os from 'os';
import Del from 'del';
import { clone } from 'lodash';

import { safeDump } from 'js-yaml';
import { getConfigFromFiles } from '../../../core/server/config/read_config';

const testConfigFile = follow('__fixtures__/reload_logging_config/kibana.test.yml');
const kibanaPath = follow('../../../../scripts/kibana.js');

const second = 1000;
const minute = second * 60;

const tempDir = Path.join(Os.tmpdir(), 'kbn-reload-test');

function follow(file: string) {
  return Path.relative(process.cwd(), Path.resolve(__dirname, file));
}

function watchFileUntil(path: string, matcher: RegExp, timeout: number) {
  return new Promise<string>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      Fs.unwatchFile(path);
      reject(`watchFileUntil timed out for "${matcher}"`);
    }, timeout);

    Fs.watchFile(path, () => {
      try {
        const contents = Fs.readFileSync(path, 'utf-8');

        if (matcher.test(contents)) {
          clearTimeout(timeoutHandle);
          Fs.unwatchFile(path);
          resolve(contents);
        }
      } catch (e) {
        // noop
      }
    });
  });
}

function containsJSON(content: string) {
  return content
    .split('\n')
    .filter(Boolean)
    .every(line => line.startsWith('{'));
}

const config = {
  read() {
    return getConfigFromFiles([testConfigFile]);
  },
  modify(fn: (input: Record<string, any>) => Record<string, any>) {
    const oldContent = clone(config.read());
    const newContent = fn(oldContent);
    config.write(newContent);
  },
  write(content: Record<string, any>) {
    const yaml = safeDump(content);
    Fs.writeFileSync(testConfigFile, yaml);
  },
};

const defaultConfig = config.read();
describe('Server logging configuration', function() {
  let child: Child.ChildProcess;
  beforeEach(() => {
    config.write(defaultConfig);
    Fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (child !== undefined) {
      child.kill();
    }

    Del.sync(tempDir, { force: true });
  });

  const isWindows = /^win/.test(process.platform);
  if (isWindows) {
    it('SIGHUP is not a feature of Windows.', () => {
      // nothing to do for Windows
    });
  } else {
    describe('legacy logging', () => {
      it(
        'should be reloadable via SIGHUP process signaling',
        async function() {
          config.modify(oldConfig => {
            oldConfig.logging.json = true;
            return oldConfig;
          });
          const logPath = Path.resolve(tempDir, 'kibana.log');

          child = Child.spawn(process.execPath, [
            kibanaPath,
            '--oss',
            '--config',
            testConfigFile,
            '--logging.dest',
            logPath,
            '--verbose',
          ]);

          const jsonContent = await watchFileUntil(logPath, /setting up root/, 30 * second);
          expect(containsJSON(jsonContent)).toBe(true);

          config.modify(oldConfig => {
            oldConfig.logging.json = false;
            return oldConfig;
          });
          child.kill('SIGHUP');

          const textContent = await watchFileUntil(logPath, /setting up root/, 50 * second);
          expect(containsJSON(textContent)).toBe(false);
        },
        minute
      );

      it(
        'should recreate file handler on SIGHUP',
        async function() {
          const logPath = Path.resolve(tempDir, 'kibana.log');
          const logPathArchived = Path.resolve(tempDir, 'kibana_archive.log');

          child = Child.spawn(process.execPath, [
            kibanaPath,
            '--oss',
            '--config',
            testConfigFile,
            '--logging.dest',
            logPath,
            '--verbose',
          ]);

          await watchFileUntil(logPath, /setting up root/, 30 * second);
          // once the server is running, archive the log file and issue SIGHUP
          Fs.renameSync(logPath, logPathArchived);
          child.kill('SIGHUP');

          const contents = await watchFileUntil(
            logPath,
            /Reloaded logging configuration due to SIGHUP/,
            10 * second
          );
          const lines = contents.toString().split('\n');
          expect(lines[0]).toMatch(/Reloaded logging configuration due to SIGHUP/);
        },
        minute
      );
    });
  }
});
