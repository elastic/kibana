/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock, httpServerMock } from '../../../core/server/mocks';
import { usageCollectionPluginMock } from '../../usage_collection/server/mocks';
import { TelemetryCollectionManagerPlugin } from './plugin';
import type { BasicStatsPayload, CollectionStrategyConfig, StatsGetterConfig } from './types';
import { TelemetrySavedObjectsClient } from './telemetry_saved_objects_client';

function createCollectionStrategy(priority: number): jest.Mocked<CollectionStrategyConfig> {
  return {
    title: 'test_collection',
    priority,
    statsGetter: jest.fn(),
    clusterDetailsGetter: jest.fn(),
  };
}

describe('Telemetry Collection Manager', () => {
  const initializerContext = coreMock.createPluginInitializerContext();
  const usageCollection = usageCollectionPluginMock.createSetupContract();

  describe('everything works when no collection mechanisms are registered', () => {
    const telemetryCollectionManager = new TelemetryCollectionManagerPlugin(initializerContext);
    const setupApi = telemetryCollectionManager.setup(coreMock.createSetup(), { usageCollection });
    test('All collectors are ready (there are none)', async () => {
      await expect(setupApi.areAllCollectorsReady()).resolves.toBe(true);
    });
    test('getStats returns empty', async () => {
      const config: StatsGetterConfig = { unencrypted: false };
      await expect(setupApi.getStats(config)).resolves.toStrictEqual([]);
    });
    test('getOptInStats returns empty', async () => {
      const config: StatsGetterConfig = { unencrypted: false };
      await expect(setupApi.getOptInStats(true, config)).resolves.toStrictEqual([]);
    });
  });

  describe('With a registered collection strategy', () => {
    const telemetryCollectionManager = new TelemetryCollectionManagerPlugin(initializerContext);
    const setupApi = telemetryCollectionManager.setup(coreMock.createSetup(), { usageCollection });
    const collectionStrategy = createCollectionStrategy(1);

    describe('before start', () => {
      test('registers a collection strategy', () => {
        const zeroCollectionStrategy = createCollectionStrategy(0);
        expect(setupApi.setCollectionStrategy(zeroCollectionStrategy)).toBeUndefined();
        // eslint-disable-next-line dot-notation
        expect(telemetryCollectionManager['collectionStrategy']).toStrictEqual(
          zeroCollectionStrategy
        );
        // eslint-disable-next-line dot-notation
        expect(telemetryCollectionManager['usageGetterMethodPriority']).toBe(0);
      });
      test('register a higher-priority collection strategy', () => {
        expect(setupApi.setCollectionStrategy(collectionStrategy)).toBeUndefined();
        // eslint-disable-next-line dot-notation
        expect(telemetryCollectionManager['collectionStrategy']).toStrictEqual(collectionStrategy);
        // eslint-disable-next-line dot-notation
        expect(telemetryCollectionManager['usageGetterMethodPriority']).toBe(1);
      });
      test('fails to register the collection strategy with the same priority', () => {
        expect(() => setupApi.setCollectionStrategy(createCollectionStrategy(1))).toThrowError(
          `A Usage Getter with the same priority is already set.`
        );
      });
      test('do not register a collection strategy with lower priority', () => {
        expect(setupApi.setCollectionStrategy(createCollectionStrategy(0))).toBeUndefined();
        // eslint-disable-next-line dot-notation
        expect(telemetryCollectionManager['collectionStrategy']).toStrictEqual(collectionStrategy);
        // eslint-disable-next-line dot-notation
        expect(telemetryCollectionManager['usageGetterMethodPriority']).toBe(1);
      });
      test('getStats returns empty because ES and SO clients are not initialized yet', async () => {
        const config: StatsGetterConfig = { unencrypted: false };
        await expect(setupApi.getStats(config)).resolves.toStrictEqual([]);
      });
      test('getOptInStats returns empty because ES and SO clients are not initialized yet', async () => {
        const config: StatsGetterConfig = { unencrypted: false };
        await expect(setupApi.getOptInStats(true, config)).resolves.toStrictEqual([]);
      });
    });

    describe(`after start`, () => {
      const basicStats: BasicStatsPayload = {
        cluster_uuid: 'clusterUuid',
        cluster_name: 'clusterName',
        timestamp: new Date().toISOString(),
        cluster_stats: {},
        stack_stats: {},
        version: 'version',
      };

      beforeAll(() => {
        telemetryCollectionManager.start(coreMock.createStart());
      });
      afterEach(() => {
        collectionStrategy.clusterDetailsGetter.mockClear();
        collectionStrategy.statsGetter.mockClear();
      });
      describe('unencrypted: false', () => {
        const config: StatsGetterConfig = { unencrypted: false };

        describe('getStats', () => {
          test('returns empty because clusterDetails returns empty, and the soClient is an instance of the TelemetrySavedObjectsClient', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([]);
            await expect(setupApi.getStats(config)).resolves.toStrictEqual([]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).toBeInstanceOf(TelemetrySavedObjectsClient);
          });

          test('returns encrypted payload', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([
              { clusterUuid: 'clusterUuid' },
            ]);
            collectionStrategy.statsGetter.mockResolvedValue([basicStats]);
            await expect(setupApi.getStats(config)).resolves.toStrictEqual([expect.any(String)]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).toBeInstanceOf(TelemetrySavedObjectsClient);
          });
        });

        describe('getOptInStats', () => {
          test('returns empty', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([]);
            await expect(setupApi.getOptInStats(true, config)).resolves.toStrictEqual([]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).toBeInstanceOf(TelemetrySavedObjectsClient);
          });

          test('returns encrypted results for opt-in true', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([
              { clusterUuid: 'clusterUuid' },
            ]);
            await expect(setupApi.getOptInStats(true, config)).resolves.toStrictEqual([
              expect.any(String),
            ]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).toBeInstanceOf(TelemetrySavedObjectsClient);
          });

          test('returns encrypted results for opt-in false', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([
              { clusterUuid: 'clusterUuid' },
            ]);
            await expect(setupApi.getOptInStats(false, config)).resolves.toStrictEqual([
              expect.any(String),
            ]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).toBeInstanceOf(TelemetrySavedObjectsClient);
          });
        });
      });
      describe('unencrypted: true', () => {
        const config: StatsGetterConfig = {
          unencrypted: true,
          request: httpServerMock.createKibanaRequest(),
        };

        describe('getStats', () => {
          test('getStats returns empty because clusterDetails returns empty, and the soClient is not an instance of the TelemetrySavedObjectsClient', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([]);
            await expect(setupApi.getStats(config)).resolves.toStrictEqual([]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).not.toBeInstanceOf(TelemetrySavedObjectsClient);
          });
          test('returns encrypted payload (assumes opted-in when no explicitly opted-out)', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([
              { clusterUuid: 'clusterUuid' },
            ]);
            collectionStrategy.statsGetter.mockResolvedValue([basicStats]);
            await expect(setupApi.getStats(config)).resolves.toStrictEqual([
              { ...basicStats, collectionSource: 'test_collection' },
            ]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).not.toBeInstanceOf(TelemetrySavedObjectsClient);
          });
        });

        describe('getOptInStats', () => {
          test('returns empty', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([]);
            await expect(setupApi.getOptInStats(true, config)).resolves.toStrictEqual([]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).not.toBeInstanceOf(TelemetrySavedObjectsClient);
          });

          test('returns results for opt-in true', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([
              { clusterUuid: 'clusterUuid' },
            ]);
            await expect(setupApi.getOptInStats(true, config)).resolves.toStrictEqual([
              { cluster_uuid: 'clusterUuid', opt_in_status: true },
            ]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).not.toBeInstanceOf(TelemetrySavedObjectsClient);
          });

          test('returns results for opt-in false', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([
              { clusterUuid: 'clusterUuid' },
            ]);
            await expect(setupApi.getOptInStats(false, config)).resolves.toStrictEqual([
              { cluster_uuid: 'clusterUuid', opt_in_status: false },
            ]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).not.toBeInstanceOf(TelemetrySavedObjectsClient);
          });
        });
      });
    });
  });
});
