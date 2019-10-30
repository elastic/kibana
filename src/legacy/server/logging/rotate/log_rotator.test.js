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

import del from 'del';
import {  existsSync, mkdtempSync, writeFileSync } from 'fs';
import { LogRotator } from './log_rotator';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

let testFilePath = null;

const createLogRotatorConfig = (logFilePath) => {
  return new Map([
    ['logging.dest', logFilePath],
    ['logging.rotate.everyBytes', 2],
    ['logging.rotate.keepFiles', 7],
    ['logging.rotate.usePolling', false],
    ['logging.rotate.pollingInterval', 10]
  ]);
};

describe('LogRotator', () => {
  beforeEach(() => {
    testFilePath = join(mkdtempSync(tmpdir()), 'log_rotator_test_log_file.log');
    console.log(testFilePath);
    writeFileSync(testFilePath, '');
  });

  afterEach(() => {
    del.sync(dirname(testFilePath), { force: true });
  });

  it('rotates log file when bigger than set limit on start', async () => {
    writeFileSync(testFilePath, 'more than 2 bytes');

    const logRotator = new LogRotator(createLogRotatorConfig(testFilePath));
    jest.spyOn(logRotator, '_sendReloadLogConfigSignal').mockImplementation(() => {});
    await logRotator.start();

    const testLogFileDir = dirname(testFilePath);
    expect(logRotator.running).toBe(true);

    await logRotator.stop();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeTruthy();
  });
});
