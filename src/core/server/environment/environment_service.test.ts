/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { EnvironmentService } from './environment_service';
import { resolveInstanceUuid } from './resolve_uuid';
import { createDataFolder } from './create_data_folder';
import { writePidFile } from './write_pid_file';
import { CoreContext } from '../core_context';

import { configServiceMock } from '../config/mocks';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { mockCoreContext } from '../core_context.mock';

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

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.create();
    configService = getConfigService();
    coreContext = mockCoreContext.create({ logger, configService });
  });

  describe('#setup()', () => {
    it('calls resolveInstanceUuid with correct parameters', async () => {
      const service = new EnvironmentService(coreContext);
      await service.setup();
      expect(resolveInstanceUuid).toHaveBeenCalledTimes(1);
      expect(resolveInstanceUuid).toHaveBeenCalledWith({
        pathConfig,
        serverConfig,
        logger: logger.get('environment'),
      });
    });

    it('calls createDataFolder with correct parameters', async () => {
      const service = new EnvironmentService(coreContext);
      await service.setup();
      expect(createDataFolder).toHaveBeenCalledTimes(1);
      expect(createDataFolder).toHaveBeenCalledWith({
        pathConfig,
        logger: logger.get('environment'),
      });
    });

    it('calls writePidFile with correct parameters', async () => {
      const service = new EnvironmentService(coreContext);
      await service.setup();
      expect(writePidFile).toHaveBeenCalledTimes(1);
      expect(writePidFile).toHaveBeenCalledWith({
        pidConfig,
        logger: logger.get('environment'),
      });
    });

    it('returns the uuid resolved from resolveInstanceUuid', async () => {
      const service = new EnvironmentService(coreContext);
      const setup = await service.setup();
      expect(setup.instanceUuid).toEqual('SOME_UUID');
    });
  });
});
