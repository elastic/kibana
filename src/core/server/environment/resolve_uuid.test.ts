/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import { PathConfigType } from '@kbn/utils';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { readFile, writeFile } from './fs';
import { resolveInstanceUuid, UUID_7_6_0_BUG } from './resolve_uuid';
import { HttpConfigType } from '../http';

jest.mock('uuid', () => ({
  v4: () => 'NEW_UUID',
}));

jest.mock('./fs', () => ({
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve('')),
}));

const DEFAULT_FILE_UUID = 'ffffffff-bbbb-0ccc-0ddd-eeeeeeeeeeee';
const DEFAULT_CONFIG_UUID = 'cccccccc-bbbb-0ccc-0ddd-eeeeeeeeeeee';
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
  (readFile as unknown as jest.Mock).mockImplementation(() => {
    if (error) {
      return Promise.reject(error);
    } else {
      return Promise.resolve(uuid);
    }
  });
};

const mockWriteFile = (error?: object) => {
  (writeFile as unknown as jest.Mock).mockImplementation(() => {
    if (error) {
      return Promise.reject(error);
    } else {
      return Promise.resolve();
    }
  });
};

const createServerConfig = (serverUuid: string | undefined) => {
  return {
    uuid: serverUuid,
  } as HttpConfigType;
};

describe('resolveInstanceUuid', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let pathConfig: PathConfigType;
  let serverConfig: HttpConfigType;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile({ uuid: DEFAULT_FILE_UUID });
    mockWriteFile();

    pathConfig = {
      data: 'data-folder',
    };
    serverConfig = createServerConfig(DEFAULT_CONFIG_UUID);

    logger = loggingSystemMock.createLogger();
  });

  describe('when file is present and config property is set', () => {
    describe('when they mismatch', () => {
      it('writes to file and returns the config uuid', async () => {
        const uuid = await resolveInstanceUuid({ pathConfig, serverConfig, logger });
        expect(uuid).toEqual(DEFAULT_CONFIG_UUID);
        expect(writeFile).toHaveBeenCalledWith(
          join('data-folder', 'uuid'),
          DEFAULT_CONFIG_UUID,
          expect.any(Object)
        );
        expect(logger.debug).toHaveBeenCalledTimes(1);
        expect(logger.debug.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            "Updating Kibana instance UUID to: cccccccc-bbbb-0ccc-0ddd-eeeeeeeeeeee (was: ffffffff-bbbb-0ccc-0ddd-eeeeeeeeeeee)",
          ]
        `);
      });
    });

    describe('when they match', () => {
      it('does not write to file', async () => {
        mockReadFile({ uuid: DEFAULT_CONFIG_UUID });
        const uuid = await resolveInstanceUuid({ pathConfig, serverConfig, logger });
        expect(uuid).toEqual(DEFAULT_CONFIG_UUID);
        expect(writeFile).not.toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledTimes(1);
        expect(logger.debug.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            "Kibana instance UUID: cccccccc-bbbb-0ccc-0ddd-eeeeeeeeeeee",
          ]
        `);
      });
    });
  });

  describe('when file is not present and config property is set', () => {
    it('writes the uuid to file and returns the config uuid', async () => {
      mockReadFile({ error: fileNotFoundError });
      const uuid = await resolveInstanceUuid({ pathConfig, serverConfig, logger });
      expect(uuid).toEqual(DEFAULT_CONFIG_UUID);
      expect(writeFile).toHaveBeenCalledWith(
        join('data-folder', 'uuid'),
        DEFAULT_CONFIG_UUID,
        expect.any(Object)
      );
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Setting new Kibana instance UUID: cccccccc-bbbb-0ccc-0ddd-eeeeeeeeeeee",
        ]
      `);
    });
  });

  describe('when file is present and config property is not set', () => {
    beforeEach(() => {
      serverConfig = createServerConfig(undefined);
    });

    it('does not write to file and returns the file uuid', async () => {
      const uuid = await resolveInstanceUuid({ pathConfig, serverConfig, logger });
      expect(uuid).toEqual(DEFAULT_FILE_UUID);
      expect(writeFile).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Resuming persistent Kibana instance UUID: ffffffff-bbbb-0ccc-0ddd-eeeeeeeeeeee",
        ]
      `);
    });

    describe('when file contains an invalid uuid', () => {
      it('throws an explicit error for uuid formatting', async () => {
        mockReadFile({ uuid: 'invalid uuid in data file' });
        await expect(
          resolveInstanceUuid({ pathConfig, serverConfig, logger })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"data-folder/uuid contains an invalid UUID"`);
      });
    });

    describe('when file contains a trailing new line', () => {
      it('returns the trimmed file uuid', async () => {
        mockReadFile({ uuid: DEFAULT_FILE_UUID + '\n' });
        const uuid = await resolveInstanceUuid({ pathConfig, serverConfig, logger });
        expect(uuid).toEqual(DEFAULT_FILE_UUID);
      });
    });
  });

  describe('when file is present with 7.6.0 UUID', () => {
    describe('when config property is not set', () => {
      it('writes new uuid to file and returns new uuid', async () => {
        mockReadFile({ uuid: UUID_7_6_0_BUG });
        serverConfig = createServerConfig(undefined);
        const uuid = await resolveInstanceUuid({ pathConfig, serverConfig, logger });
        expect(uuid).not.toEqual(UUID_7_6_0_BUG);
        expect(uuid).toEqual('NEW_UUID');
        expect(writeFile).toHaveBeenCalledWith(
          join('data-folder', 'uuid'),
          'NEW_UUID',
          expect.any(Object)
        );
        expect(logger.debug).toHaveBeenCalledTimes(2);
        expect(logger.debug.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              "UUID from 7.6.0 bug detected, ignoring file UUID",
            ],
            Array [
              "Setting new Kibana instance UUID: NEW_UUID",
            ],
          ]
        `);
      });
    });

    describe('when config property is set', () => {
      it('writes config uuid to file and returns config uuid', async () => {
        mockReadFile({ uuid: UUID_7_6_0_BUG });
        serverConfig = createServerConfig(DEFAULT_CONFIG_UUID);
        const uuid = await resolveInstanceUuid({ pathConfig, serverConfig, logger });
        expect(uuid).not.toEqual(UUID_7_6_0_BUG);
        expect(uuid).toEqual(DEFAULT_CONFIG_UUID);
        expect(writeFile).toHaveBeenCalledWith(
          join('data-folder', 'uuid'),
          DEFAULT_CONFIG_UUID,
          expect.any(Object)
        );
        expect(logger.debug).toHaveBeenCalledTimes(2);
        expect(logger.debug.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              "UUID from 7.6.0 bug detected, ignoring file UUID",
            ],
            Array [
              "Setting new Kibana instance UUID: cccccccc-bbbb-0ccc-0ddd-eeeeeeeeeeee",
            ],
          ]
        `);
      });
    });
  });

  describe('when file is not present and config property is not set', () => {
    it('generates a new uuid and write it to file', async () => {
      serverConfig = createServerConfig(undefined);
      mockReadFile({ error: fileNotFoundError });
      const uuid = await resolveInstanceUuid({ pathConfig, serverConfig, logger });
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
        resolveInstanceUuid({ pathConfig, serverConfig, logger })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to read UUID file at data-folder/uuid.  Ensure Kibana has sufficient permissions to read / write to this file.  Error was: EACCES"`
      );
    });
    it('throws an explicit error for file write errors', async () => {
      mockWriteFile(isDirectoryError);
      await expect(
        resolveInstanceUuid({ pathConfig, serverConfig, logger })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to write to UUID file at data-folder/uuid. Ensure Kibana has sufficient permissions to read / write to this file.  Error was: EISDIR"`
      );
    });
  });
});
