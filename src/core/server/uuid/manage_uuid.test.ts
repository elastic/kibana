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

import { readFile, writeFile } from 'fs';
import { join } from 'path';
import { manageInstanceUuid } from './manage_uuid';
import { configServiceMock } from '../config/config_service.mock';
import { BehaviorSubject } from 'rxjs';

jest.mock('uuid', () => ({
  v4: () => 'NEW_UUID',
}));

jest.mock('fs', () => ({
  readFile: jest.fn((path, callback) => callback(null, Buffer.from(''))),
  writeFile: jest.fn((path, value, options, callback) => callback(null, null)),
}));

const DEFAULT_FILE_UUID = 'FILE_UUID';
const DEFAULT_CONFIG_UUID = 'CONFIG_UUID';
const fileNotFoundError = { code: 'ENOENT' };

const mockReadFile = ({
  uuid = DEFAULT_FILE_UUID,
  error = null,
}: Partial<{
  uuid: string;
  error: any;
}>) => {
  ((readFile as unknown) as jest.Mock).mockImplementation((path, callback) => {
    if (error) {
      callback(error, null);
    } else {
      callback(null, Buffer.from(uuid));
    }
  });
};

const getConfigService = (serverUUID: string | undefined) => {
  const configService = configServiceMock.create();
  configService.atPath.mockImplementation(path => {
    if (path === 'path') {
      return new BehaviorSubject({
        data: 'data-folder',
      });
    }
    if (path === 'server') {
      return new BehaviorSubject({
        uuid: serverUUID,
      });
    }
    return new BehaviorSubject({});
  });
  return configService;
};

describe('manageInstanceUUID', () => {
  let configService: ReturnType<typeof configServiceMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile({ uuid: DEFAULT_FILE_UUID });
    configService = getConfigService(DEFAULT_CONFIG_UUID);
  });

  describe('when file is present and config property is set', () => {
    it('writes to file and returns the config uuid if they mismatch', async () => {
      const uuid = await manageInstanceUuid(configService);
      expect(uuid).toEqual(DEFAULT_CONFIG_UUID);
      expect(writeFile).toHaveBeenCalledWith(
        join('data-folder', 'uuid'),
        DEFAULT_CONFIG_UUID,
        expect.any(Object),
        expect.any(Function)
      );
    });
    it('does not write to file if they match', async () => {
      mockReadFile({ uuid: DEFAULT_CONFIG_UUID });
      const uuid = await manageInstanceUuid(configService);
      expect(uuid).toEqual(DEFAULT_CONFIG_UUID);
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('when file is not present and config property is set', () => {
    it('writes the uuid to file and returns the config uuid', async () => {
      mockReadFile({ error: fileNotFoundError });
      const uuid = await manageInstanceUuid(configService);
      expect(uuid).toEqual(DEFAULT_CONFIG_UUID);
      expect(writeFile).toHaveBeenCalledWith(
        join('data-folder', 'uuid'),
        DEFAULT_CONFIG_UUID,
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('when file is present and config property is not set', () => {
    it('does not write to file and returns the file uuid', async () => {
      configService = getConfigService(undefined);
      const uuid = await manageInstanceUuid(configService);
      expect(uuid).toEqual(DEFAULT_FILE_UUID);
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('when file is not present and config property is not set', () => {
    it('generates a new uuid and write it to file', async () => {
      configService = getConfigService(undefined);
      mockReadFile({ error: fileNotFoundError });
      const uuid = await manageInstanceUuid(configService);
      expect(uuid).toEqual('NEW_UUID');
      expect(writeFile).toHaveBeenCalledWith(
        join('data-folder', 'uuid'),
        'NEW_UUID',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });
});
