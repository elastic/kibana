/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Tests for the inference-endpoint preflight wiring in KibanaMigrator.runMigrationsInternal.
 * Verifies that:
 *   - the preflight is skipped entirely (zero ES calls) when no type declares semanticSearch;
 *   - missing endpoints are logged as errors naming the type(s) and inference ID;
 *   - non-404 errors are logged as "could not verify" without blocking migration;
 *   - migration always proceeds regardless of preflight outcome.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  type MigrationResult,
  SavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-base-server-internal';
import { ByteSizeValue } from '@kbn/config-schema';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { KibanaMigrator, type KibanaMigratorOptions } from './kibana_migrator';

const SUCCESSFUL_MIGRATION_RESULT: MigrationResult[] = [
  { destIndex: '.my_index_8.2.3_001', elapsedMs: 1, status: 'patched' },
];

jest.mock('./run_v2_migration', () => ({
  runV2Migration: jest.fn(
    (): Promise<MigrationResult[]> => Promise.resolve(SUCCESSFUL_MIGRATION_RESULT)
  ),
}));

jest.mock('./zdt', () => ({
  runZeroDowntimeMigration: jest.fn(
    (): Promise<MigrationResult[]> => Promise.resolve(SUCCESSFUL_MIGRATION_RESULT)
  ),
}));

const createRegistry = (types: Array<Partial<SavedObjectsType>>) => {
  const registry = new SavedObjectTypeRegistry();
  types.forEach((type) =>
    registry.registerType({
      name: 'unknown',
      hidden: false,
      namespaceType: 'single',
      mappings: { properties: {} },
      migrations: {},
      ...type,
    })
  );
  return registry;
};

const createResponseError = (statusCode: number) =>
  new EsErrors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode,
      body: { error: { type: 'es_type', reason: 'es_reason' } },
    })
  );

const mockOptions = (
  typeRegistry: SavedObjectTypeRegistry,
  algorithm: 'v2' | 'zdt' = 'v2'
): KibanaMigratorOptions => {
  const mockedClient = elasticsearchClientMock.createElasticsearchClient();
  (mockedClient as any).child = jest.fn().mockImplementation(() => mockedClient);

  return {
    logger: loggingSystemMock.create().get(),
    kibanaVersion: '8.2.3',
    waitForMigrationCompletion: false,
    hashToVersionMap: {},
    typeRegistry,
    kibanaIndex: '.my_index',
    soMigrationsConfig: {
      algorithm,
      batchSize: 20,
      maxBatchSizeBytes: ByteSizeValue.parse('20mb'),
      maxReadBatchSizeBytes: new ByteSizeValue(536870888),
      pollInterval: 20000,
      scrollDuration: '10m',
      skip: false,
      retryAttempts: 20,
      zdt: {
        metaPickupSyncDelaySec: 120,
        runOnRoles: ['migrator'],
      },
      // Use false so logger calls are real (not deferred) — lets us assert on them directly.
      useCumulativeLogger: false,
    },
    client: mockedClient,
    docLinks: docLinksServiceMock.createSetupContract(),
    nodeRoles: { backgroundTasks: true, ui: true, migrator: true },
    esCapabilities: elasticsearchServiceMock.createCapabilities(),
  };
};

describe('KibanaMigrator — inference endpoint preflight', () => {
  describe('when no registered type declares semanticSearch', () => {
    it('makes no inference.get calls and runs migration normally', async () => {
      const registry = createRegistry([
        { name: 'plain-type', mappings: { properties: { title: { type: 'keyword' } } } },
      ]);
      const options = mockOptions(registry);
      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();

      const result = await migrator.runMigrations();

      expect((options.client as any).inference.get).not.toHaveBeenCalled();
      expect(result).toEqual(SUCCESSFUL_MIGRATION_RESULT);
    });

    it('logs no inference-preflight messages', async () => {
      const registry = createRegistry([
        { name: 'plain-type', mappings: { properties: { title: { type: 'keyword' } } } },
      ]);
      const options = mockOptions(registry);
      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();

      await migrator.runMigrations();

      const errorCalls = (options.logger.error as jest.Mock).mock.calls;
      const inferenceRelatedErrors = errorCalls.filter(
        ([msg]: [string]) => typeof msg === 'string' && msg.includes('inference endpoint')
      );
      expect(inferenceRelatedErrors).toHaveLength(0);
    });
  });

  describe('when a type declares semanticSearch and the endpoint exists', () => {
    it('logs no error and migration proceeds', async () => {
      const registry = createRegistry([
        {
          name: 'my-type',
          mappings: { properties: { title: { type: 'text' } } },
          semanticSearch: { fields: ['title'] },
        },
      ]);
      const options = mockOptions(registry);
      (options.client as any).inference.get.mockResolvedValue({ endpoints: [] });

      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();

      const result = await migrator.runMigrations();

      expect((options.client as any).inference.get).toHaveBeenCalledWith({
        inference_id: '.elser-2-elasticsearch',
      });
      expect((options.logger.error as jest.Mock).mock.calls).toHaveLength(0);
      expect(result).toEqual(SUCCESSFUL_MIGRATION_RESULT);
    });
  });

  describe('when a type declares semanticSearch and the endpoint is missing (404)', () => {
    it('logs an error naming the type, inference ID, and degraded state', async () => {
      const registry = createRegistry([
        {
          name: 'my-type',
          mappings: { properties: { title: { type: 'text' } } },
          semanticSearch: { fields: ['title'] },
        },
      ]);
      const options = mockOptions(registry);
      (options.client as any).inference.get.mockRejectedValue(createResponseError(404));

      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();

      const result = await migrator.runMigrations();

      const errorCalls: string[] = (options.logger.error as jest.Mock).mock.calls.map(
        ([msg]: [string]) => msg
      );
      const preflightError = errorCalls.find((msg) =>
        msg.toLowerCase().includes('inference endpoint')
      );
      expect(preflightError).toBeDefined();
      // Must name the inference ID.
      expect(preflightError).toContain('.elser-2-elasticsearch');
      // Must name the type(s).
      expect(preflightError).toContain('my-type');
      // Must communicate degradation.
      expect(preflightError?.toLowerCase()).toContain('degraded');
      // Migration must still complete.
      expect(result).toEqual(SUCCESSFUL_MIGRATION_RESULT);
    });

    it('proceeds unconditionally — migration is not blocked', async () => {
      const registry = createRegistry([
        {
          name: 'my-type',
          mappings: { properties: { title: { type: 'text' } } },
          semanticSearch: { fields: ['title'] },
        },
      ]);
      const options = mockOptions(registry);
      (options.client as any).inference.get.mockRejectedValue(createResponseError(404));

      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();

      await expect(migrator.runMigrations()).resolves.toEqual(SUCCESSFUL_MIGRATION_RESULT);
    });
  });

  describe('when inference.get throws a non-404 error', () => {
    it('logs a "could not verify" error and proceeds', async () => {
      const registry = createRegistry([
        {
          name: 'my-type',
          mappings: { properties: { title: { type: 'text' } } },
          semanticSearch: { fields: ['title'] },
        },
      ]);
      const options = mockOptions(registry);
      (options.client as any).inference.get.mockRejectedValue(new Error('network failure'));

      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();

      const result = await migrator.runMigrations();

      const errorCalls: string[] = (options.logger.error as jest.Mock).mock.calls.map(
        ([msg]: [string]) => msg
      );
      const preflightError = errorCalls.find((msg) =>
        msg.toLowerCase().includes('inference endpoint')
      );
      expect(preflightError).toBeDefined();
      expect(preflightError).toContain('.elser-2-elasticsearch');
      expect(preflightError).toContain('my-type');
      expect(preflightError).toContain('proceeding');
      expect(result).toEqual(SUCCESSFUL_MIGRATION_RESULT);
    });
  });

  describe('when two types share the same inference endpoint', () => {
    it('calls inference.get exactly once for the shared endpoint', async () => {
      const registry = createRegistry([
        {
          name: 'type-a',
          mappings: { properties: { title: { type: 'text' } } },
          semanticSearch: { fields: ['title'] },
        },
        {
          name: 'type-b',
          mappings: { properties: { body: { type: 'text' } } },
          semanticSearch: { fields: ['body'] },
        },
      ]);
      const options = mockOptions(registry);
      (options.client as any).inference.get.mockRejectedValue(createResponseError(404));

      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();

      await migrator.runMigrations();

      // Both types resolve to the same default ELSER endpoint — only one GET call.
      expect((options.client as any).inference.get).toHaveBeenCalledTimes(1);
    });

    it('names both types in the error log when the shared endpoint is missing', async () => {
      const registry = createRegistry([
        {
          name: 'type-a',
          mappings: { properties: { title: { type: 'text' } } },
          semanticSearch: { fields: ['title'] },
        },
        {
          name: 'type-b',
          mappings: { properties: { body: { type: 'text' } } },
          semanticSearch: { fields: ['body'] },
        },
      ]);
      const options = mockOptions(registry);
      (options.client as any).inference.get.mockRejectedValue(createResponseError(404));

      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();

      await migrator.runMigrations();

      const errorCalls: string[] = (options.logger.error as jest.Mock).mock.calls.map(
        ([msg]: [string]) => msg
      );
      const preflightError = errorCalls.find((msg) =>
        msg.toLowerCase().includes('inference endpoint')
      );
      expect(preflightError).toContain('type-a');
      expect(preflightError).toContain('type-b');
    });
  });

  describe('ZDT migration path', () => {
    it('also runs the preflight before ZDT migration', async () => {
      const registry = createRegistry([
        {
          name: 'my-type',
          mappings: { properties: { title: { type: 'text' } } },
          semanticSearch: { fields: ['title'] },
        },
      ]);
      const options = mockOptions(registry, 'zdt');
      (options.client as any).inference.get.mockRejectedValue(createResponseError(404));

      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();

      const result = await migrator.runMigrations();

      expect((options.client as any).inference.get).toHaveBeenCalledTimes(1);
      // ZDT migration still completes.
      expect(result).toEqual(SUCCESSFUL_MIGRATION_RESULT);
    });
  });

  describe('when useCumulativeLogger is true (serverless path)', () => {
    const mockOptionsWithCumulativeLogger = (
      typeRegistry: SavedObjectTypeRegistry
    ): KibanaMigratorOptions => ({
      ...mockOptions(typeRegistry),
      soMigrationsConfig: {
        ...mockOptions(typeRegistry).soMigrationsConfig,
        useCumulativeLogger: true,
      },
    });

    it('still emits the preflight degradation error to the underlying logger on migration success', async () => {
      const registry = createRegistry([
        {
          name: 'my-type',
          mappings: { properties: { title: { type: 'text' } } },
          semanticSearch: { fields: ['title'] },
        },
      ]);
      const options = mockOptionsWithCumulativeLogger(registry);
      (options.client as any).inference.get.mockRejectedValue(createResponseError(404));

      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();

      // Migration succeeds (the cumulative logger clears buffered logs on success).
      const result = await migrator.runMigrations();
      expect(result).toEqual(SUCCESSFUL_MIGRATION_RESULT);

      // The preflight error must still reach the underlying logger because preflight
      // is called with this.log, not the cumulative wrapper.
      const errorCalls: string[] = (options.logger.error as jest.Mock).mock.calls.map(
        ([msg]: [string]) => msg
      );
      const preflightError = errorCalls.find((msg) =>
        msg.toLowerCase().includes('inference endpoint')
      );
      expect(preflightError).toBeDefined();
      expect(preflightError).toContain('.elser-2-elasticsearch');
      expect(preflightError?.toLowerCase()).toContain('degraded');
    });
  });
});
