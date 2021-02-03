/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PathConfigType } from '@kbn/utils';
import { createDataFolder } from './create_data_folder';
import { mkdir } from './fs';
import { loggingSystemMock } from '../logging/logging_system.mock';

jest.mock('./fs', () => ({
  mkdir: jest.fn(() => Promise.resolve('')),
}));

const mkdirMock = mkdir as jest.Mock;

describe('createDataFolder', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let pathConfig: PathConfigType;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    pathConfig = {
      data: '/path/to/data/folder',
    };
    mkdirMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls `mkdir` with the correct parameters', async () => {
    await createDataFolder({ pathConfig, logger });
    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(mkdirMock).toHaveBeenCalledWith(pathConfig.data, { recursive: true });
  });

  it('does not log error if the `mkdir` call is successful', async () => {
    await createDataFolder({ pathConfig, logger });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('throws an error if the `mkdir` call fails', async () => {
    mkdirMock.mockRejectedValue('some-error');
    await expect(() => createDataFolder({ pathConfig, logger })).rejects.toMatchInlineSnapshot(
      `"some-error"`
    );
  });

  it('logs an error message if the `mkdir` call fails', async () => {
    mkdirMock.mockRejectedValue('some-error');
    try {
      await createDataFolder({ pathConfig, logger });
    } catch (e) {
      /* trap */
    }
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Error trying to create data folder at /path/to/data/folder: some-error",
      ]
    `);
  });
});
