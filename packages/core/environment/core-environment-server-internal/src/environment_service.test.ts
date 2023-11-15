/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import type { CoreContext } from '@kbn/core-base-server-internal';
import type { AnalyticsServicePreboot } from '@kbn/core-analytics-server';

import { EnvironmentService } from './environment_service';
import { resolveInstanceUuid } from './resolve_uuid';
import { createDataFolder } from './create_data_folder';
import { writePidFile } from './write_pid_file';

import { configServiceMock } from '@kbn/config-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';

jest.mock('./resolve_uuid', () => ({
  resolveInstanceUuid: jest.fn().mockResolvedValue('SOME_UUID'),
}));

jest.mock('./create_data_folder', () => ({
  createDataFolder: jest.fn(),
}));

jest.mock('./write_pid_file', () => ({
  writePidFile: jest.fn(),
}));

const pathConfig = {
  data: 'data-folder',
};
const serverConfig = {
  uuid: 'SOME_UUID',
};
const pidConfig = {
  file: '/pid/file',
  exclusive: 'false',
};

const getConfigService = () => {
  const configService = configServiceMock.create();
  configService.atPath.mockImplementation((path) => {
    if (path === 'path') {
      return new BehaviorSubject(pathConfig);
    }
    if (path === 'server') {
      return new BehaviorSubject(serverConfig);
    }
    if (path === 'pid') {
      return new BehaviorSubject(pidConfig);
    }
    return new BehaviorSubject({});
  });
  return configService;
};

describe('UuidService', () => {
  let logger: ReturnType<typeof loggingSystemMock.create>;
  let configService: ReturnType<typeof configServiceMock.create>;
  let coreContext: CoreContext;
  let service: EnvironmentService;
  let analytics: AnalyticsServicePreboot;

  beforeEach(async () => {
    logger = loggingSystemMock.create();
    configService = getConfigService();
    coreContext = mockCoreContext.create({ logger, configService });
    analytics = analyticsServiceMock.createAnalyticsServicePreboot();

    service = new EnvironmentService(coreContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#preboot()', () => {
    it('calls resolveInstanceUuid with correct parameters', async () => {
      await service.preboot({ analytics });

      expect(resolveInstanceUuid).toHaveBeenCalledTimes(1);
      expect(resolveInstanceUuid).toHaveBeenCalledWith({
        pathConfig,
        serverConfig,
        logger: logger.get('environment'),
      });
    });

    it('calls createDataFolder with correct parameters', async () => {
      await service.preboot({ analytics });

      expect(createDataFolder).toHaveBeenCalledTimes(1);
      expect(createDataFolder).toHaveBeenCalledWith({
        pathConfig,
        logger: logger.get('environment'),
      });
    });

    it('calls writePidFile with correct parameters', async () => {
      await service.preboot({ analytics });

      expect(writePidFile).toHaveBeenCalledTimes(1);
      expect(writePidFile).toHaveBeenCalledWith({
        pidConfig,
        logger: logger.get('environment'),
      });
    });

    it('returns the uuid resolved from resolveInstanceUuid', async () => {
      const preboot = await service.preboot({ analytics });

      expect(preboot.instanceUuid).toEqual('SOME_UUID');
    });

    describe('process warnings', () => {
      it('does not log deprecation warnings', async () => {
        await service.preboot({ analytics });

        const warning = new Error('something went wrong');
        warning.name = 'DeprecationWarning';
        process.emit('warning', warning);

        expect(logger.get('process').warn).not.toHaveBeenCalled();
      });
    });

    // TODO: From Nodejs v16 emitting an unhandledRejection will kill the process
    describe.skip('unhandledRejection warnings', () => {
      it('logs warn for an unhandeld promise rejected with an Error', async () => {
        await service.preboot({ analytics });

        const err = new Error('something went wrong');
        process.emit('unhandledRejection', err, new Promise((res, rej) => rej(err)));

        expect(logger.get('process').warn).toHaveBeenCalledTimes(1);
        expect(loggingSystemMock.collect(logger).warn[0][0]).toMatch(
          /Detected an unhandled Promise rejection: Error: something went wrong\n.*at /
        );
      });

      it('logs warn for an unhandeld promise rejected with a string', async () => {
        await service.preboot({ analytics });

        const err = 'something went wrong';
        process.emit('unhandledRejection', err, new Promise((res, rej) => rej(err)));

        expect(logger.get('process').warn).toHaveBeenCalledTimes(1);
        expect(loggingSystemMock.collect(logger).warn[0][0]).toMatch(
          /Detected an unhandled Promise rejection: "something went wrong"/
        );
      });
    });
  });

  describe('#setup()', () => {
    it('returns the uuid resolved from resolveInstanceUuid', async () => {
      await expect(service.preboot({ analytics })).resolves.toEqual({ instanceUuid: 'SOME_UUID' });
      expect(service.setup()).toEqual({ instanceUuid: 'SOME_UUID' });
    });
  });
});
