/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GetDeprecationsContext } from './types';
import { DeprecationsFactory } from './deprecations_factory';
import { loggerMock } from '../logging/logger.mock';

describe('DeprecationsFactory', () => {
  const logger = loggerMock.create();
  beforeEach(() => {
    loggerMock.clear(logger);
  });

  describe('getRegistry', () => {
    const domainId = 'test-plugin';

    it('creates a registry for a domainId', async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const registry = deprecationsFactory.getRegistry(domainId);

      expect(registry).toHaveProperty('registerDeprecations');
      expect(registry).toHaveProperty('getDeprecations');
    });

    it('creates one registry for a domainId', async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const registry = deprecationsFactory.getRegistry(domainId);
      const sameRegistry = deprecationsFactory.getRegistry(domainId);

      expect(registry).toStrictEqual(sameRegistry);
    });

    it('returns a registered registry', () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const mockRegistry = 'mock-reg';
      const mockRegistries = {
        set: jest.fn(),
        get: jest.fn().mockReturnValue(mockRegistry),
      };

      // @ts-expect-error
      deprecationsFactory.registries = mockRegistries;
      const result = deprecationsFactory.getRegistry(domainId);

      expect(mockRegistries.get).toBeCalledTimes(1);
      expect(mockRegistries.get).toBeCalledWith(domainId);
      expect(mockRegistries.set).toBeCalledTimes(0);
      expect(result).toStrictEqual(mockRegistry);
    });
  });

  describe('getAllDeprecations', () => {
    const mockDependencies = {
      esClient: jest.fn(),
      savedObjectsClient: jest.fn(),
    } as unknown as GetDeprecationsContext;

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

      const mockPluginRegistry = deprecationsFactory.getRegistry('mockPlugin');
      const anotherMockPluginRegistry = deprecationsFactory.getRegistry('anotherMockPlugin');
      mockPluginRegistry.registerDeprecations({
        getDeprecations: jest.fn().mockResolvedValue(mockPluginDeprecationsInfo),
      });
      anotherMockPluginRegistry.registerDeprecations({
        getDeprecations: jest.fn().mockResolvedValue(anotherMockPluginDeprecationsInfo),
      });

      const derpecations = await deprecationsFactory.getAllDeprecations(mockDependencies);
      expect(derpecations).toStrictEqual(
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

      const deprecationsRegistry = deprecationsFactory.getRegistry(domainId);
      deprecationsRegistry.registerDeprecations({
        getDeprecations: jest.fn().mockRejectedValue(mockError),
      });
      const derpecations = await deprecationsFactory.getAllDeprecations(mockDependencies);
      expect(logger.warn).toBeCalledTimes(1);
      expect(logger.warn).toBeCalledWith(
        `Failed to get deprecations info for plugin "${domainId}".`,
        mockError
      );
      expect(derpecations).toMatchInlineSnapshot(`
        Array [
          Object {
            "correctiveActions": Object {
              "manualSteps": Array [
                "Check Kibana server logs for error message.",
              ],
            },
            "domainId": "mockPlugin",
            "level": "fetch_error",
            "message": "Unable to fetch deprecations info for plugin mockPlugin.",
            "title": "Failed to fetch deprecations for mockPlugin",
          },
        ]
      `);
    });

    it(`returns successful results even when some getDeprecations fail`, async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const mockPluginRegistry = deprecationsFactory.getRegistry('mockPlugin');
      const anotherMockPluginRegistry = deprecationsFactory.getRegistry('anotherMockPlugin');
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
      const derpecations = await deprecationsFactory.getAllDeprecations(mockDependencies);

      expect(logger.warn).toBeCalledTimes(1);
      expect(logger.warn).toBeCalledWith(
        `Failed to get deprecations info for plugin "anotherMockPlugin".`,
        mockError
      );
      expect(derpecations).toStrictEqual([
        ...mockPluginDeprecationsInfo.map((info) => ({ ...info, domainId: 'mockPlugin' })),
        {
          domainId: 'anotherMockPlugin',
          title: 'Failed to fetch deprecations for anotherMockPlugin',
          message: 'Unable to fetch deprecations info for plugin anotherMockPlugin.',
          level: 'fetch_error',
          correctiveActions: {
            manualSteps: ['Check Kibana server logs for error message.'],
          },
        },
      ]);
    });
  });

  describe('getDeprecations', () => {
    const mockDependencies = {
      esClient: jest.fn(),
      savedObjectsClient: jest.fn(),
    } as unknown as GetDeprecationsContext;

    it('returns a flattened array of DeprecationInfo', async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const deprecationsRegistry = deprecationsFactory.getRegistry('mockPlugin');
      const deprecationsBody = [
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
        getDeprecations: jest.fn().mockResolvedValue(deprecationsBody),
      });

      const derpecations = await deprecationsFactory.getDeprecations(
        'mockPlugin',
        mockDependencies
      );
      expect(derpecations).toStrictEqual(
        deprecationsBody.flat().map((body) => ({ ...body, domainId: 'mockPlugin' }))
      );
    });

    it('removes empty entries from the returned array', async () => {
      const deprecationsFactory = new DeprecationsFactory({ logger });
      const deprecationsRegistry = deprecationsFactory.getRegistry('mockPlugin');
      const deprecationsBody = [
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
        getDeprecations: jest.fn().mockResolvedValue(deprecationsBody),
      });

      const derpecations = await deprecationsFactory.getDeprecations(
        'mockPlugin',
        mockDependencies
      );
      expect(derpecations).toHaveLength(1);
      expect(derpecations).toStrictEqual([{ ...deprecationsBody[0], domainId: 'mockPlugin' }]);
    });
  });
});
