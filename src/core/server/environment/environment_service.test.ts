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

import { BehaviorSubject } from 'rxjs';
import { EnvironmentService } from './environment_service';
import { resolveInstanceUuid } from './resolve_uuid';
import { createDataFolder } from './create_data_folder';
import { CoreContext } from '../core_context';

import { configServiceMock } from '../config/config_service.mock';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { mockCoreContext } from '../core_context.mock';

jest.mock('./resolve_uuid', () => ({
  resolveInstanceUuid: jest.fn().mockResolvedValue('SOME_UUID'),
}));

jest.mock('./create_data_folder', () => ({
  createDataFolder: jest.fn(),
}));

const pathConfig = {
  data: 'data-folder',
};
const serverConfig = {
  uuid: 'SOME_UUID',
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
        logger: logger.get('uuid'),
      });
    });

    it('calls createDataFolder with correct parameters', async () => {
      const service = new EnvironmentService(coreContext);
      await service.setup();
      expect(createDataFolder).toHaveBeenCalledTimes(1);
      expect(createDataFolder).toHaveBeenCalledWith({
        pathConfig,
        logger: logger.get('uuid'),
      });
    });

    it('returns the uuid resolved from resolveInstanceUuid', async () => {
      const service = new EnvironmentService(coreContext);
      const setup = await service.setup();
      expect(setup.instanceUuid).toEqual('SOME_UUID');
    });
  });
});
