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

import { join } from 'path';
import { readFile, writeFile } from './fs';
import { resolveInstanceUuid } from './resolve_uuid';
import { configServiceMock } from '../config/config_service.mock';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { BehaviorSubject } from 'rxjs';
import { Logger } from '../logging';

jest.mock('uuid', () => ({
  v4: () => 'NEW_UUID',
}));

jest.mock('./fs', () => ({
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve('')),
}));

const DEFAULT_FILE_UUID = 'FILE_UUID';
const DEFAULT_CONFIG_UUID = 'CONFIG_UUID';
const fileNotFoundError = { code: 'ENOENT' };
const permissionError = { code: 'EACCES' };
const isDirectoryError = { code: 'EISDIR' };

const mockReadFile = ({
  uuid = DEFAULT_FILE_UUID,
  error = null,
}: Partial<{
  uuid: string;
  error: any;
}>) => {
  ((readFile as unknown) as jest.Mock).mockImplementation(() => {
    if (error) {
      return Promise.reject(error);
    } else {
      return Promise.resolve(uuid);
    }
  });
};

const mockWriteFile = (error?: object) => {
  ((writeFile as unknown) as jest.Mock).mockImplementation(() => {
    if (error) {
      return Promise.reject(error);
    } else {
      return Promise.resolve();
    }
  });
};

const getConfigService = (serverUuid: string | undefined) => {
  const configService = configServiceMock.create();
  configService.atPath.mockImplementation(path => {
    if (path === 'path') {
      return new BehaviorSubject({
        data: 'data-folder',
      });
    }
    if (path === 'server') {
      return new BehaviorSubject({
        uuid: serverUuid,
      });
    }
    return new BehaviorSubject({});
  });
  return configService;
};

describe('resolveInstanceUuid', () => {
  let configService: ReturnType<typeof configServiceMock.create>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile({ uuid: DEFAULT_FILE_UUID });
    mockWriteFile();
    configService = getConfigService(DEFAULT_CONFIG_UUID);
    logger = loggingServiceMock.create().get() as any;
  });

  describe('when file is present and config property is set', () => {
    it('writes to file and returns the config uuid if they mismatch', async () => {
      const uuid = await resolveInstanceUuid(configService, logger);
      expect(uuid).toEqual(DEFAULT_CONFIG_UUID);
      expect(writeFile).toHaveBeenCalledWith(
        join('data-folder', 'uuid'),
        DEFAULT_CONFIG_UUID,
        expect.any(Object)
      );
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Updating Kibana instance UUID to: CONFIG_UUID (was: FILE_UUID)",
        ]
      `);
    });
    it('does not write to file if they match', async () => {
      mockReadFile({ uuid: DEFAULT_CONFIG_UUID });
      const uuid = await resolveInstanceUuid(configService, logger);
      expect(uuid).toEqual(DEFAULT_CONFIG_UUID);
      expect(writeFile).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Kibana instance UUID: CONFIG_UUID",
        ]
      `);
    });
  });

  describe('when file is not present and config property is set', () => {
    it('writes the uuid to file and returns the config uuid', async () => {
      mockReadFile({ error: fileNotFoundError });
      const uuid = await resolveInstanceUuid(configService, logger);
      expect(uuid).toEqual(DEFAULT_CONFIG_UUID);
      expect(writeFile).toHaveBeenCalledWith(
        join('data-folder', 'uuid'),
        DEFAULT_CONFIG_UUID,
        expect.any(Object)
      );
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Setting new Kibana instance UUID: CONFIG_UUID",
        ]
      `);
    });
  });

  describe('when file is present and config property is not set', () => {
    it('does not write to file and returns the file uuid', async () => {
      configService = getConfigService(undefined);
      const uuid = await resolveInstanceUuid(configService, logger);
      expect(uuid).toEqual(DEFAULT_FILE_UUID);
      expect(writeFile).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Resuming persistent Kibana instance UUID: FILE_UUID",
        ]
      `);
    });
  });

  describe('when file is not present and config property is not set', () => {
    it('generates a new uuid and write it to file', async () => {
      configService = getConfigService(undefined);
      mockReadFile({ error: fileNotFoundError });
      const uuid = await resolveInstanceUuid(configService, logger);
      expect(uuid).toEqual('NEW_UUID');
      expect(writeFile).toHaveBeenCalledWith(
        join('data-folder', 'uuid'),
        'NEW_UUID',
        expect.any(Object)
      );
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Setting new Kibana instance UUID: NEW_UUID",
        ]
      `);
    });
  });

  describe('when file access error occurs', () => {
    it('throws an explicit error for file read errors', async () => {
      mockReadFile({ error: permissionError });
      await expect(
        resolveInstanceUuid(configService, logger)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to read Kibana UUID file, please check the uuid.server configuration value in kibana.yml and ensure Kibana has sufficient permissions to read / write to this file. Error was: EACCES"`
      );
    });
    it('throws an explicit error for file write errors', async () => {
      mockWriteFile(isDirectoryError);
      await expect(
        resolveInstanceUuid(configService, logger)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to write Kibana UUID file, please check the uuid.server configuration value in kibana.yml and ensure Kibana has sufficient permissions to read / write to this file. Error was: EISDIR"`
      );
    });
  });
});
