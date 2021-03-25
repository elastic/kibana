/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GetDeprecationsContext } from './types';
import { DeprecationsFactory } from './deprecations_factory';
import { loggerMock } from '../logging/logger.mock';

describe('DeprecationsFactory', () => {
  const logger = loggerMock.create();
  beforeEach(() => {
    loggerMock.clear(logger);
  });

  describe('createRegistry', () => {
    it('creates a registry for a domainId', async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const domainId = 'test-plugin';
      const registry = deprecationsFactory.createRegistry(domainId);

      expect(registry).toHaveProperty('registerDeprecations');
      expect(registry).toHaveProperty('getDeprecations');
    });

    it('creates one registry for a domainId', async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const domainId = 'test-plugin';
      const registry = deprecationsFactory.createRegistry(domainId);
      const sameRegistry = deprecationsFactory.createRegistry(domainId);

      expect(registry).toStrictEqual(sameRegistry);
    });
  });

  describe('getRegistry', () => {
    const domainId = 'test-plugin';
    const deprecationsFactory = new DeprecationsFactory({ logger });
    it('returns a registered registry', () => {
      const registry = deprecationsFactory.createRegistry(domainId);
      expect(deprecationsFactory.getRegistry(domainId)).toStrictEqual(registry);
    });
    it('returns undefined if no registry is defined', () => {
      expect(deprecationsFactory.getRegistry('never-registered-plugin')).toBe(undefined);
    });
  });

  describe('getAllDeprecations', () => {
    const mockDependencies = ({
      esClient: jest.fn(),
      savedObjectsClient: jest.fn(),
    } as unknown) as GetDeprecationsContext;

    it('returns a flattened array of deprecations', async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const mockPluginDeprecationsInfo = [
        {
          message: 'mockPlugin message',
          level: 'critical',
          correctiveActions: {
            manualSteps: ['mockPlugin step 1', 'mockPlugin step 2'],
          },
        },
        {
          message: 'hello there!',
          level: 'warning',
          correctiveActions: {
            manualSteps: ['mockPlugin step a', 'mockPlugin step b'],
          },
        },
      ];
      const anotherMockPluginDeprecationsInfo = [
        {
          message: 'anotherMockPlugin message',
          level: 'critical',
          correctiveActions: {
            manualSteps: ['anotherMockPlugin step 1', 'anotherMockPlugin step 2'],
          },
        },
      ];

      const mockPluginRegistry = deprecationsFactory.createRegistry('mockPlugin');
      const anotherMockPluginRegistry = deprecationsFactory.createRegistry('anotherMockPlugin');
      mockPluginRegistry.registerDeprecations({
        getDeprecations: jest.fn().mockResolvedValue(mockPluginDeprecationsInfo),
      });
      anotherMockPluginRegistry.registerDeprecations({
        getDeprecations: jest.fn().mockResolvedValue(anotherMockPluginDeprecationsInfo),
      });

      const derpecationsInfo = await deprecationsFactory.getAllDeprecations(mockDependencies);
      expect(derpecationsInfo).toStrictEqual(
        [
          mockPluginDeprecationsInfo.map((info) => ({ ...info, domainId: 'mockPlugin' })),
          anotherMockPluginDeprecationsInfo.map((info) => ({
            ...info,
            domainId: 'anotherMockPlugin',
          })),
        ].flat()
      );
    });

    it(`returns a failure message for failed getDeprecations functions`, async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const domainId = 'mockPlugin';
      const mockError = new Error();

      const deprecationsRegistry = deprecationsFactory.createRegistry(domainId);
      deprecationsRegistry.registerDeprecations({
        getDeprecations: jest.fn().mockRejectedValue(mockError),
      });
      const derpecationsInfo = await deprecationsFactory.getAllDeprecations(mockDependencies);
      expect(logger.warn).toBeCalledTimes(1);
      expect(logger.warn).toBeCalledWith(
        `Failed to get deprecations info for plugin "${domainId}".`,
        mockError
      );
      expect(derpecationsInfo).toStrictEqual([
        {
          domainId,
          message: `Failed to get deprecations info for plugin "${domainId}".`,
          level: 'warning',
          correctiveActions: {
            manualSteps: ['Check Kibana server logs for error message.'],
          },
        },
      ]);
    });

    it(`returns successful results even when some getDeprecations fail`, async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const mockPluginRegistry = deprecationsFactory.createRegistry('mockPlugin');
      const anotherMockPluginRegistry = deprecationsFactory.createRegistry('anotherMockPlugin');
      const mockError = new Error();
      const mockPluginDeprecationsInfo = [
        {
          message: 'mockPlugin message',
          level: 'critical',
          correctiveActions: {
            manualSteps: ['mockPlugin step 1', 'mockPlugin step 2'],
          },
        },
      ];
      mockPluginRegistry.registerDeprecations({
        getDeprecations: jest.fn().mockResolvedValue(mockPluginDeprecationsInfo),
      });
      anotherMockPluginRegistry.registerDeprecations({
        getDeprecations: jest.fn().mockRejectedValue(mockError),
      });
      const derpecationsInfo = await deprecationsFactory.getAllDeprecations(mockDependencies);

      expect(logger.warn).toBeCalledTimes(1);
      expect(logger.warn).toBeCalledWith(
        `Failed to get deprecations info for plugin "anotherMockPlugin".`,
        mockError
      );
      expect(derpecationsInfo).toStrictEqual([
        ...mockPluginDeprecationsInfo.map((info) => ({ ...info, domainId: 'mockPlugin' })),
        {
          domainId: 'anotherMockPlugin',
          message: `Failed to get deprecations info for plugin "anotherMockPlugin".`,
          level: 'warning',
          correctiveActions: {
            manualSteps: ['Check Kibana server logs for error message.'],
          },
        },
      ]);
    });
  });

  describe('getDeprecations', () => {
    const mockDependencies = ({
      esClient: jest.fn(),
      savedObjectsClient: jest.fn(),
    } as unknown) as GetDeprecationsContext;

    it('returns a flattened array of DeprecationInfo', async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const deprecationsRegistry = deprecationsFactory.createRegistry('mockPlugin');
      const deprecationsInfoBody = [
        {
          message: 'mockPlugin message',
          level: 'critical',
          correctiveActions: {
            manualSteps: ['mockPlugin step 1', 'mockPlugin step 2'],
          },
        },
        [
          {
            message: 'hello there!',
            level: 'warning',
            correctiveActions: {
              manualSteps: ['mockPlugin step a', 'mockPlugin step b'],
            },
          },
        ],
      ];

      deprecationsRegistry.registerDeprecations({
        getDeprecations: jest.fn().mockResolvedValue(deprecationsInfoBody),
      });

      const derpecationsInfo = await deprecationsFactory.getDeprecations(
        'mockPlugin',
        mockDependencies
      );
      expect(derpecationsInfo).toStrictEqual(
        deprecationsInfoBody.flat().map((body) => ({ ...body, domainId: 'mockPlugin' }))
      );
    });

    it('removes empty entries from the returned array', async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const deprecationsRegistry = deprecationsFactory.createRegistry('mockPlugin');
      const deprecationsInfoBody = [
        {
          message: 'mockPlugin message',
          level: 'critical',
          correctiveActions: {
            manualSteps: ['mockPlugin step 1', 'mockPlugin step 2'],
          },
        },
        [undefined],
        undefined,
      ];

      deprecationsRegistry.registerDeprecations({
        getDeprecations: jest.fn().mockResolvedValue(deprecationsInfoBody),
      });

      const derpecationsInfo = await deprecationsFactory.getDeprecations(
        'mockPlugin',
        mockDependencies
      );
      expect(derpecationsInfo).toHaveLength(1);
      expect(derpecationsInfo).toStrictEqual([
        { ...deprecationsInfoBody[0], domainId: 'mockPlugin' },
      ]);
    });
  });
});
