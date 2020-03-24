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
import fs, { existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import { LogRotator } from './log_rotator';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

const mockOn = jest.fn();
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: mockOn,
    close: jest.fn(),
  })),
}));

jest.mock('lodash', () => ({
  ...require.requireActual('lodash'),
  throttle: (fn: any) => fn,
}));

const tempDir = join(tmpdir(), 'kbn_log_rotator_test');
const testFilePath = join(tempDir, 'log_rotator_test_log_file.log');

const createLogRotatorConfig: any = (logFilePath: string) => {
  return new Map([
    ['logging.dest', logFilePath],
    ['logging.rotate.everyBytes', 2],
    ['logging.rotate.keepFiles', 2],
    ['logging.rotate.usePolling', false],
    ['logging.rotate.pollingInterval', 10000],
  ] as any);
};

const mockServer: any = {
  log: jest.fn(),
};

const writeBytesToFile = (filePath: string, numberOfBytes: number) => {
  writeFileSync(filePath, 'a'.repeat(numberOfBytes), { flag: 'a' });
};

describe('LogRotator', () => {
  beforeEach(() => {
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(testFilePath, '');
  });

  afterEach(() => {
    del.sync(dirname(testFilePath), { force: true });
    mockOn.mockClear();
  });

  it('rotates log file when bigger than set limit on start', async () => {
    writeBytesToFile(testFilePath, 3);

    const logRotator = new LogRotator(createLogRotatorConfig(testFilePath), mockServer);
    jest.spyOn(logRotator, '_sendReloadLogConfigSignal').mockImplementation(() => {});
    await logRotator.start();

    expect(logRotator.running).toBe(true);

    await logRotator.stop();
    const testLogFileDir = dirname(testFilePath);

    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeTruthy();
  });

  it('rotates log file when equal than set limit over time', async () => {
    writeBytesToFile(testFilePath, 1);

    const logRotator = new LogRotator(createLogRotatorConfig(testFilePath), mockServer);
    jest.spyOn(logRotator, '_sendReloadLogConfigSignal').mockImplementation(() => {});
    await logRotator.start();

    expect(logRotator.running).toBe(true);

    const testLogFileDir = dirname(testFilePath);
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeFalsy();

    writeBytesToFile(testFilePath, 1);

    // ['change', [asyncFunction]]
    const onChangeCb = mockOn.mock.calls[0][1];
    await onChangeCb(testLogFileDir, { size: 2 });

    await logRotator.stop();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeTruthy();
  });

  it('rotates log file when file size is bigger than limit', async () => {
    writeBytesToFile(testFilePath, 1);

    const logRotator = new LogRotator(createLogRotatorConfig(testFilePath), mockServer);
    jest.spyOn(logRotator, '_sendReloadLogConfigSignal').mockImplementation(() => {});
    await logRotator.start();

    expect(logRotator.running).toBe(true);

    const testLogFileDir = dirname(testFilePath);
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeFalsy();

    writeBytesToFile(testFilePath, 2);

    // ['change', [asyncFunction]]
    const onChangeCb = mockOn.mock.calls[0][1];
    await onChangeCb(testLogFileDir, { size: 3 });

    await logRotator.stop();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeTruthy();
  });

  it('rotates log file service correctly keeps number of files', async () => {
    writeBytesToFile(testFilePath, 3);

    const logRotator = new LogRotator(createLogRotatorConfig(testFilePath), mockServer);
    jest.spyOn(logRotator, '_sendReloadLogConfigSignal').mockImplementation(() => {});
    await logRotator.start();

    expect(logRotator.running).toBe(true);

    const testLogFileDir = dirname(testFilePath);
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeTruthy();

    writeBytesToFile(testFilePath, 2);

    // ['change', [asyncFunction]]
    const onChangeCb = mockOn.mock.calls[0][1];
    await onChangeCb(testLogFileDir, { size: 2 });

    writeBytesToFile(testFilePath, 5);
    await onChangeCb(testLogFileDir, { size: 5 });

    await logRotator.stop();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeTruthy();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.1'))).toBeTruthy();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.2'))).toBeFalsy();
    expect(statSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0')).size).toBe(5);
  });

  it('rotates log file service correctly keeps number of files even when number setting changes', async () => {
    writeBytesToFile(testFilePath, 3);

    const logRotator = new LogRotator(createLogRotatorConfig(testFilePath), mockServer);
    jest.spyOn(logRotator, '_sendReloadLogConfigSignal').mockImplementation(() => {});
    await logRotator.start();

    expect(logRotator.running).toBe(true);

    const testLogFileDir = dirname(testFilePath);
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeTruthy();

    writeBytesToFile(testFilePath, 2);

    // ['change', [asyncFunction]]
    const onChangeCb = mockOn.mock.calls[0][1];
    await onChangeCb(testLogFileDir, { size: 2 });

    writeBytesToFile(testFilePath, 5);
    await onChangeCb(testLogFileDir, { size: 5 });

    await logRotator.stop();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeTruthy();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.1'))).toBeTruthy();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.2'))).toBeFalsy();
    expect(statSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0')).size).toBe(5);

    logRotator.keepFiles = 1;
    await logRotator.start();

    writeBytesToFile(testFilePath, 5);
    await onChangeCb(testLogFileDir, { size: 5 });

    await logRotator.stop();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0'))).toBeTruthy();
    expect(existsSync(join(testLogFileDir, 'log_rotator_test_log_file.log.1'))).toBeFalsy();
    expect(statSync(join(testLogFileDir, 'log_rotator_test_log_file.log.0')).size).toBe(5);
  });

  it('rotates log file service correctly detects usePolling when it should be false', async () => {
    writeBytesToFile(testFilePath, 1);

    const logRotator = new LogRotator(createLogRotatorConfig(testFilePath), mockServer);
    jest.spyOn(logRotator, '_sendReloadLogConfigSignal').mockImplementation(() => {});
    await logRotator.start();

    expect(logRotator.running).toBe(true);
    expect(logRotator.usePolling).toBe(false);

    const shouldUsePolling = await logRotator._shouldUsePolling();
    expect(shouldUsePolling).toBe(false);

    await logRotator.stop();
  });

  it('rotates log file service correctly detects usePolling when it should be true', async () => {
    writeBytesToFile(testFilePath, 1);

    const logRotator = new LogRotator(createLogRotatorConfig(testFilePath), mockServer);
    jest.spyOn(logRotator, '_sendReloadLogConfigSignal').mockImplementation(() => {});

    jest.spyOn(fs, 'watch').mockImplementation(
      () =>
        ({
          on: jest.fn((eventType, cb) => {
            if (eventType === 'error') {
              cb();
            }
          }),
          close: jest.fn(),
        } as any)
    );

    await logRotator.start();

    expect(logRotator.running).toBe(true);
    expect(logRotator.usePolling).toBe(false);
    expect(logRotator.shouldUsePolling).toBe(true);

    await logRotator.stop();
  });

  it('rotates log file service correctly fallback to usePolling true after defined timeout', async () => {
    jest.useFakeTimers();
    writeBytesToFile(testFilePath, 1);

    const logRotator = new LogRotator(createLogRotatorConfig(testFilePath), mockServer);
    jest.spyOn(logRotator, '_sendReloadLogConfigSignal').mockImplementation(() => {});
    jest.spyOn(fs, 'watch').mockImplementation(
      () =>
        ({
          on: jest.fn((ev: string) => {
            if (ev === 'error') {
              jest.runTimersToTime(15000);
            }
          }),
          close: jest.fn(),
        } as any)
    );

    await logRotator.start();

    expect(logRotator.running).toBe(true);
    expect(logRotator.usePolling).toBe(false);
    expect(logRotator.shouldUsePolling).toBe(true);

    await logRotator.stop();
    jest.useRealTimers();
  });
});
