/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import type { CoreContext } from '@kbn/core-base-server-internal';

import { NodeService } from './node_service';

import { configServiceMock } from '@kbn/config-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

const getMockedConfigService = (nodeConfig: unknown) => {
  const configService = configServiceMock.create();
  configService.atPath.mockImplementation((path) => {
    if (path === 'node') {
      return new BehaviorSubject(nodeConfig);
    }
    return new BehaviorSubject({});
  });
  return configService;
};

describe('NodeService', () => {
  let logger: ReturnType<typeof loggingSystemMock.create>;
  let configService: ReturnType<typeof configServiceMock.create>;
  let coreContext: CoreContext;
  let service: NodeService;

  beforeEach(async () => {
    logger = loggingSystemMock.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#preboot()', () => {
    it('returns default roles values when wildcard is provided', async () => {
      configService = getMockedConfigService({ roles: ['*'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      const { roles } = await service.preboot({ loggingSystem: logger });

      expect(roles.backgroundTasks).toBe(true);
      expect(roles.ui).toBe(true);
    });

    it('returns correct roles when node is configured to `background_tasks`', async () => {
      configService = getMockedConfigService({ roles: ['background_tasks'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      const { roles } = await service.preboot({ loggingSystem: logger });

      expect(roles.backgroundTasks).toBe(true);
      expect(roles.ui).toBe(false);
    });

    it('returns correct roles when node is configured to `ui`', async () => {
      configService = getMockedConfigService({ roles: ['ui'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      const { roles } = await service.preboot({ loggingSystem: logger });

      expect(roles.backgroundTasks).toBe(false);
      expect(roles.ui).toBe(true);
    });

    it('returns correct roles when node is configured to both `background_tasks` and `ui`', async () => {
      configService = getMockedConfigService({ roles: ['background_tasks', 'ui'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      const { roles } = await service.preboot({ loggingSystem: logger });

      expect(roles.backgroundTasks).toBe(true);
      expect(roles.ui).toBe(true);
    });

    it('logs the node roles', async () => {
      const mockLogger = loggingSystemMock.createLogger();
      logger.get.mockImplementation(() => mockLogger);

      configService = getMockedConfigService({ roles: ['*'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      await service.preboot({ loggingSystem: logger });

      expect(logger.get).toHaveBeenCalledTimes(1);
      expect(logger.get).toHaveBeenCalledWith('node');
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info.mock.calls[0][0]).toMatchInlineSnapshot(
        `"Kibana process configured with roles: [background_tasks, ui]"`
      );
    });

    it('sets the node roles in the global context', async () => {
      configService = getMockedConfigService({ roles: ['*'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      await service.preboot({ loggingSystem: logger });

      expect(logger.setGlobalContext).toHaveBeenCalledTimes(1);
      expect(logger.setGlobalContext).toHaveBeenCalledWith({
        service: { node: { roles: ['background_tasks', 'ui'] } },
      });
    });
  });
  describe('#start()', () => {
    it('returns default roles values when wildcard is provided', async () => {
      configService = getMockedConfigService({ roles: ['*'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      await service.preboot({ loggingSystem: logger });
      const { roles } = service.start();

      expect(roles.backgroundTasks).toBe(true);
      expect(roles.ui).toBe(true);
    });

    it('returns correct roles when node is configured to `background_tasks`', async () => {
      configService = getMockedConfigService({ roles: ['background_tasks'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      await service.preboot({ loggingSystem: logger });
      const { roles } = service.start();

      expect(roles.backgroundTasks).toBe(true);
      expect(roles.ui).toBe(false);
    });

    it('returns correct roles when node is configured to `ui`', async () => {
      configService = getMockedConfigService({ roles: ['ui'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      await service.preboot({ loggingSystem: logger });
      const { roles } = service.start();

      expect(roles.backgroundTasks).toBe(false);
      expect(roles.ui).toBe(true);
    });

    it('returns correct roles when node is configured to both `background_tasks` and `ui`', async () => {
      configService = getMockedConfigService({ roles: ['background_tasks', 'ui'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      await service.preboot({ loggingSystem: logger });
      const { roles } = service.start();

      expect(roles.backgroundTasks).toBe(true);
      expect(roles.ui).toBe(true);
    });
    it('throws if preboot has not been run', () => {
      configService = getMockedConfigService({ roles: ['background_tasks', 'ui'] });
      coreContext = mockCoreContext.create({ logger, configService });

      service = new NodeService(coreContext);
      expect(() => service.start()).toThrowErrorMatchingInlineSnapshot(
        `"NodeService#start() can only be called after NodeService#preboot()"`
      );
    });
  });
});
