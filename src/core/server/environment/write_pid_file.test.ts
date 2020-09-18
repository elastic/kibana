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

import { writeFile, exists } from './fs';
import { writePidFile } from './write_pid_file';
import { loggingSystemMock } from '../logging/logging_system.mock';

jest.mock('./fs', () => ({
  writeFile: jest.fn(),
  exists: jest.fn(),
}));

const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;
const existsMock = exists as jest.MockedFunction<typeof exists>;

const pid = String(process.pid);

describe('writePidFile', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.spyOn(process, 'once');

    writeFileMock.mockImplementation(() => Promise.resolve());
    existsMock.mockImplementation(() => Promise.resolve(false));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const allLogs = () =>
    Object.entries(loggingSystemMock.collect(logger)).reduce((messages, [key, value]) => {
      return [...messages, ...(key === 'log' ? [] : (value as any[]).map(([msg]) => [key, msg]))];
    }, [] as any[]);

  it('does nothing if `pid.file` is not set', async () => {
    await writePidFile({
      pidConfig: {
        file: undefined,
        exclusive: false,
      },
      logger,
    });
    expect(writeFile).not.toHaveBeenCalled();
    expect(process.once).not.toHaveBeenCalled();
    expect(allLogs()).toMatchInlineSnapshot(`Array []`);
  });

  it('writes the pid file to `pid.file`', async () => {
    existsMock.mockResolvedValue(false);

    await writePidFile({
      pidConfig: {
        file: '/pid-file',
        exclusive: false,
      },
      logger,
    });

    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledWith('/pid-file', pid);

    expect(process.once).toHaveBeenCalledTimes(2);
    expect(process.once).toHaveBeenCalledWith('exit', expect.any(Function));
    expect(process.once).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    expect(allLogs()).toMatchInlineSnapshot(`
      Array [
        Array [
          "debug",
          "wrote pid file to /pid-file",
        ],
      ]
    `);
  });

  it('throws an error if the file exists and `pid.exclusive is true`', async () => {
    existsMock.mockResolvedValue(true);

    await expect(
      writePidFile({
        pidConfig: {
          file: '/pid-file',
          exclusive: true,
        },
        logger,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"pid file already exists at /pid-file"`);

    expect(writeFile).not.toHaveBeenCalled();
    expect(process.once).not.toHaveBeenCalled();
    expect(allLogs()).toMatchInlineSnapshot(`Array []`);
  });

  it('logs a warning if the file exists and `pid.exclusive` is false', async () => {
    existsMock.mockResolvedValue(true);

    await writePidFile({
      pidConfig: {
        file: '/pid-file',
        exclusive: false,
      },
      logger,
    });

    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledWith('/pid-file', pid);

    expect(process.once).toHaveBeenCalledTimes(2);
    expect(process.once).toHaveBeenCalledWith('exit', expect.any(Function));
    expect(process.once).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    expect(allLogs()).toMatchInlineSnapshot(`
      Array [
        Array [
          "debug",
          "wrote pid file to /pid-file",
        ],
        Array [
          "warn",
          "pid file already exists at /pid-file",
        ],
      ]
    `);
  });
});
