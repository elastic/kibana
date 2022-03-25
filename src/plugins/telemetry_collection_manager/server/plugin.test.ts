/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '../../../core/server/mocks';
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
    beforeEach(() => {
      // Reset cache on every request.
      // 10s cache to avoid misatekly invalidating cache during test runs
      // eslint-disable-next-line dot-notation
      telemetryCollectionManager['cacheManager'].resetCache();
    });

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
        cluster_stats: {
          cluster_uuid: 'clusterUuid',
        },
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
            await expect(setupApi.getStats(config)).resolves.toStrictEqual([
              {
                clusterUuid: 'clusterUuid',
                stats: expect.any(String),
              },
            ]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).toBeInstanceOf(TelemetrySavedObjectsClient);
          });

          it('calls getStats with passed refreshCache config', async () => {
            const getStatsCollectionConfig: jest.SpyInstance<
              TelemetryCollectionManagerPlugin['getStatsCollectionConfig']
              // @ts-expect-error spying on private method.
            > = jest.spyOn(telemetryCollectionManager, 'getStatsCollectionConfig');
            await setupApi.getStats(config);
            await setupApi.getStats({ ...config, refreshCache: false });
            await setupApi.getStats({ ...config, refreshCache: true });

            expect(getStatsCollectionConfig).toBeCalledTimes(3);
            expect(getStatsCollectionConfig).toHaveBeenNthCalledWith(1, config, usageCollection);
            expect(getStatsCollectionConfig).toHaveNthReturnedWith(
              1,
              expect.objectContaining({ refreshCache: false })
            );

            expect(getStatsCollectionConfig).toHaveBeenNthCalledWith(
              2,
              expect.objectContaining({ refreshCache: false }),
              usageCollection
            );
            expect(getStatsCollectionConfig).toHaveNthReturnedWith(
              2,
              expect.objectContaining({ refreshCache: false })
            );

            expect(getStatsCollectionConfig).toHaveBeenNthCalledWith(
              3,
              expect.objectContaining({ refreshCache: true }),
              usageCollection
            );
            expect(getStatsCollectionConfig).toHaveNthReturnedWith(
              3,
              expect.objectContaining({ refreshCache: true })
            );

            getStatsCollectionConfig.mockRestore();
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
              {
                clusterUuid: 'clusterUuid',
                stats: expect.any(String),
              },
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
              {
                clusterUuid: 'clusterUuid',
                stats: expect.any(String),
              },
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
        };

        describe('getStats', () => {
          test('getStats returns empty because clusterDetails returns empty, and the soClient is an instance of the TelemetrySavedObjectsClient', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([]);
            await expect(setupApi.getStats(config)).resolves.toStrictEqual([]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).toBeInstanceOf(TelemetrySavedObjectsClient);
          });
          test('returns encrypted payload (assumes opted-in when no explicitly opted-out)', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([
              { clusterUuid: 'clusterUuid' },
            ]);
            collectionStrategy.statsGetter.mockResolvedValue([basicStats]);
            await expect(setupApi.getStats(config)).resolves.toStrictEqual([
              {
                clusterUuid: 'clusterUuid',
                stats: {
                  ...basicStats,
                  cacheDetails: { updatedAt: expect.any(String), fetchedAt: expect.any(String) },
                  collectionSource: 'test_collection',
                },
              },
            ]);

            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).toBeInstanceOf(TelemetrySavedObjectsClient);
          });

          it('calls getStats with config { refreshCache: true } even if set to false', async () => {
            const getStatsCollectionConfig: jest.SpyInstance<
              TelemetryCollectionManagerPlugin['getStatsCollectionConfig']
              // @ts-expect-error spying on private method.
            > = jest.spyOn(telemetryCollectionManager, 'getStatsCollectionConfig');
            await setupApi.getStats(config);

            expect(getStatsCollectionConfig).toBeCalledTimes(1);
            expect(getStatsCollectionConfig).toBeCalledWith(
              expect.not.objectContaining({ refreshCache: true }),
              usageCollection
            );
            expect(getStatsCollectionConfig).toReturnWith(
              expect.objectContaining({
                refreshCache: true,
              })
            );

            getStatsCollectionConfig.mockRestore();
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

          test('returns results for opt-in true', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([
              { clusterUuid: 'clusterUuid' },
            ]);
            await expect(setupApi.getOptInStats(true, config)).resolves.toStrictEqual([
              {
                clusterUuid: 'clusterUuid',
                stats: { opt_in_status: true, cluster_uuid: 'clusterUuid' },
              },
            ]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).toBeInstanceOf(TelemetrySavedObjectsClient);
          });

          test('returns results for opt-in false', async () => {
            collectionStrategy.clusterDetailsGetter.mockResolvedValue([
              { clusterUuid: 'clusterUuid' },
            ]);
            await expect(setupApi.getOptInStats(false, config)).resolves.toStrictEqual([
              {
                clusterUuid: 'clusterUuid',
                stats: { opt_in_status: false, cluster_uuid: 'clusterUuid' },
              },
            ]);
            expect(
              collectionStrategy.clusterDetailsGetter.mock.calls[0][0].soClient
            ).toBeInstanceOf(TelemetrySavedObjectsClient);
          });
        });
      });
    });
  });
});
