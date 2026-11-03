/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { take } from 'rxjs';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  type MigrationAlgorithm,
  type MigrationResult,
  SavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-base-server-internal';
import { KibanaMigrator, type KibanaMigratorOptions } from './kibana_migrator';
import { MIGRATION_CLIENT_OPTIONS } from './kibana_migrator_constants';
import { DocumentMigrator } from './document_migrator';
import { ByteSizeValue } from '@kbn/config-schema';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { lastValueFrom } from 'rxjs';
import { runV2Migration } from './run_v2_migration';
import { runZeroDowntimeMigration } from './zdt';
import { runV3Migration } from './v3';

const V2_SUCCESSFUL_MIGRATION_RESULT: MigrationResult[] = [
  {
    sourceIndex: '.my_index_pre8.2.3_001',
    destIndex: '.my_index_8.2.3_001',
    elapsedMs: 14,
    status: 'migrated',
  },
];

const ZDT_SUCCESSFUL_MIGRATION_RESULT: MigrationResult[] = [
  {
    sourceIndex: '.my_index_8.8.0_001',
    destIndex: '.my_index_8.8.1_001',
    elapsedMs: 14,
    status: 'migrated',
  },
  {
    destIndex: '.other_index_8.8.0_001',
    elapsedMs: 128,
    status: 'patched',
  },
];

jest.mock('./run_v2_migration', () => {
  return {
    runV2Migration: jest.fn((options): Promise<MigrationResult[]> => {
      options.logger.info('Running v2 migrations');
      return Promise.resolve(V2_SUCCESSFUL_MIGRATION_RESULT);
    }),
  };
});

jest.mock('./zdt', () => {
  return {
    runZeroDowntimeMigration: jest.fn(
      (): Promise<MigrationResult[]> => Promise.resolve(ZDT_SUCCESSFUL_MIGRATION_RESULT)
    ),
  };
});

const V3_SUCCESSFUL_MIGRATION_RESULT: MigrationResult[] = [
  { status: 'patched', destIndex: '.my_index', elapsedMs: 12 },
];

jest.mock('./v3', () => {
  return {
    ...jest.requireActual('./v3'),
    runV3Migration: jest.fn(
      (): Promise<MigrationResult[]> => Promise.resolve(V3_SUCCESSFUL_MIGRATION_RESULT)
    ),
  };
});

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

const mockRunV2Migration = runV2Migration as jest.MockedFunction<typeof runV2Migration>;
const mockRunZeroDowntimeMigration = runZeroDowntimeMigration as jest.MockedFunction<
  typeof runZeroDowntimeMigration
>;
const mockRunV3Migration = runV3Migration as jest.MockedFunction<typeof runV3Migration>;

describe('KibanaMigrator', () => {
  beforeEach(() => {
    mockRunV2Migration.mockClear();
    mockRunZeroDowntimeMigration.mockClear();
    mockRunV3Migration.mockClear();
  });
  describe('getActiveMappings', () => {
    it('returns full index mappings w/ core properties', () => {
      const options = mockOptions();
      options.typeRegistry = createRegistry([
        {
          name: 'amap',
          mappings: {
            properties: { field: { type: 'text' } },
          },
        },
        {
          name: 'bmap',
          indexPattern: '.other_index',
          mappings: {
            properties: { field: { type: 'text' } },
          },
        },
      ]);

      const mappings = new KibanaMigrator(options).getActiveMappings();
      expect(mappings).toMatchSnapshot();
    });
  });

  describe('migrateDocument', () => {
    it('throws an error if documentMigrator.prepareMigrations is not called previously', () => {
      const options = mockOptions();
      const kibanaMigrator = new KibanaMigrator(options);
      const doc = {} as any;
      expect(() => kibanaMigrator.migrateDocument(doc)).toThrow(
        /Migrations are not ready. Make sure prepareMigrations is called first./i
      );
    });

    // TODO check if it applies
    it('calls documentMigrator.migrate', () => {
      const options = mockOptions();
      const kibanaMigrator = new KibanaMigrator(options);
      jest.spyOn(DocumentMigrator.prototype, 'migrate').mockImplementation((doc) => doc);
      const doc = {} as any;

      expect(() => kibanaMigrator.migrateDocument(doc)).not.toThrow();
      expect(DocumentMigrator.prototype.migrate).toHaveBeenCalledTimes(1);
    });
  });

  describe('runMigrations', () => {
    it("calls runV2Migration with the right params when the migration algorithm is 'v2'", async () => {
      const options = mockOptions();
      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();
      const res = await migrator.runMigrations();

      expect(runV2Migration).toHaveBeenCalledTimes(1);
      expect(runZeroDowntimeMigration).not.toHaveBeenCalled();
      expect(runV2Migration).toHaveBeenCalledWith(
        expect.objectContaining({
          kibanaVersion: '8.2.3',
          kibanaIndexPrefix: '.my_index',
          migrationConfig: options.soMigrationsConfig,
          waitForMigrationCompletion: false,
        })
      );
      expect(res).toEqual(V2_SUCCESSFUL_MIGRATION_RESULT);
    });

    it("calls runZeroDowntimeMigration with the right params when the migration algorithm is 'zdt'", async () => {
      const options = mockOptions('zdt');
      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();
      const res = await migrator.runMigrations();

      expect(runZeroDowntimeMigration).toHaveBeenCalledTimes(1);
      expect(runV2Migration).not.toHaveBeenCalled();
      expect(runZeroDowntimeMigration).toHaveBeenCalledWith(
        expect.objectContaining({
          kibanaVersion: '8.2.3',
          kibanaIndexPrefix: '.my_index',
          migrationConfig: options.soMigrationsConfig,
        })
      );
      expect(res).toEqual(ZDT_SUCCESSFUL_MIGRATION_RESULT);
    });

    it("runs the v3 migration with the classic profile when the migration algorithm is 'v3'", async () => {
      const options = { ...mockOptions('v3'), kibanaVersionCheck: '8.18.0' };
      const migrator = new KibanaMigrator(options);
      const migratorStatus = lastValueFrom(migrator.getStatus$().pipe(take(3)));
      migrator.prepareMigrations();

      await expect(migrator.runMigrations()).resolves.toEqual(V3_SUCCESSFUL_MIGRATION_RESULT);
      await expect(migratorStatus).resolves.toEqual({
        status: 'completed',
        result: V3_SUCCESSFUL_MIGRATION_RESULT,
      });
      expect(runV2Migration).not.toHaveBeenCalled();
      expect(runZeroDowntimeMigration).not.toHaveBeenCalled();
      expect(runV3Migration).toHaveBeenCalledWith(
        expect.objectContaining({
          kibanaIndexPrefix: '.my_index',
          kibanaVersion: '8.2.3',
          minimumPreviousVersion: '8.18.0',
          elasticsearchClient: options.client,
          inputs: expect.objectContaining({ allowDowngrade: false, migrateDocuments: true }),
        })
      );
    });

    it('skips the minimum previous version check when asked to', async () => {
      const migrator = new KibanaMigrator({ ...mockOptions('v3'), kibanaVersionCheck: '8.18.0' });
      migrator.prepareMigrations();
      await migrator.runMigrations({ skipVersionCheck: true });

      expect(runV3Migration).toHaveBeenCalledWith(
        expect.objectContaining({ minimumPreviousVersion: undefined })
      );
    });

    it('only runs migrations once if called multiple times', async () => {
      const options = mockOptions();
      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();
      await migrator.runMigrations();
      await migrator.runMigrations();
      await migrator.runMigrations();

      // indices.get is called twice during a single migration
      expect(runV2Migration).toHaveBeenCalledTimes(1);
    });

    it('emits v2 results on getMigratorResult$()', async () => {
      const options = mockOptions();
      const migrator = new KibanaMigrator(options);
      const migratorStatus = lastValueFrom(migrator.getStatus$().pipe(take(3)));
      migrator.prepareMigrations();
      await migrator.runMigrations();

      const { status, result } = await migratorStatus;
      expect(status).toEqual('completed');
      expect(result).toEqual(V2_SUCCESSFUL_MIGRATION_RESULT);
    });

    it('emits zdt results on getMigratorResult$()', async () => {
      const options = mockOptions('zdt');
      const migrator = new KibanaMigrator(options);
      const migratorStatus = lastValueFrom(migrator.getStatus$().pipe(take(3)));
      migrator.prepareMigrations();
      await migrator.runMigrations();

      const { status, result } = await migratorStatus;
      expect(status).toEqual('completed');
      expect(result).toEqual(ZDT_SUCCESSFUL_MIGRATION_RESULT);
    });

    it('rejects when the v2 migrator algorithm rejects', async () => {
      const options = mockOptions();
      const migrator = new KibanaMigrator(options);

      const fatal = new Error(
        `Unable to complete saved object migrations for the [${options.kibanaIndex}] index: Something went horribly wrong`
      );
      mockRunV2Migration.mockRejectedValueOnce(fatal);

      migrator.prepareMigrations();
      await expect(migrator.runMigrations()).rejects.toEqual(fatal);
    });

    it('rejects when the zdt migrator algorithm rejects', async () => {
      const options = mockOptions('zdt');
      const migrator = new KibanaMigrator(options);

      const fatal = new Error(
        `Unable to complete saved object migrations for the [${options.kibanaIndex}] index: Something went terribly wrong`
      );
      mockRunZeroDowntimeMigration.mockRejectedValueOnce(fatal);

      migrator.prepareMigrations();
      await expect(migrator.runMigrations()).rejects.toEqual(fatal);
    });

    it('does not log intermediate steps when `useCumulativeLogger: true`', async () => {
      const options = mockOptions();
      (options.soMigrationsConfig.useCumulativeLogger as boolean) = true; // casting because soMigrationsConfig are readonly
      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();
      await migrator.runMigrations();

      expect(options.logger.info).toHaveBeenCalledTimes(0);
      expect(options.logger.warn).toHaveBeenCalledTimes(0);
      expect(options.logger.error).toHaveBeenCalledTimes(0);
    });

    it('logs the intermediate steps when `useCumulativeLogger: false`', async () => {
      const options = mockOptions();
      (options.soMigrationsConfig.useCumulativeLogger as boolean) = false; // casting because soMigrationsConfig are readonly
      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();
      await migrator.runMigrations();

      expect(options.logger.info).toHaveBeenCalledTimes(1);
      expect(options.logger.warn).toHaveBeenCalledTimes(0);
      expect(options.logger.error).toHaveBeenCalledTimes(0);
      expect(options.logger.info).toHaveBeenNthCalledWith(1, 'Running v2 migrations');
    });
  });

  describe.each([
    { method: 'initialize', migrateDocuments: false, pickupUpdatedMappings: false },
    { method: 'migrate', migrateDocuments: true, pickupUpdatedMappings: true },
  ] as const)('$method', ({ method, migrateDocuments, pickupUpdatedMappings }) => {
    const createTenantClient = () => ({
      tenantClient: elasticsearchClientMock.createElasticsearchClient(),
    });

    it('runs v3 against the given client with the migration client options, whatever the configured algorithm', async () => {
      const migrator = new KibanaMigrator(mockOptions('v2'));
      migrator.prepareMigrations();
      const { tenantClient } = createTenantClient();

      await expect(
        migrator[method]({ client: tenantClient, esCapabilities: { serverless: true } })
      ).resolves.toEqual(V3_SUCCESSFUL_MIGRATION_RESULT);
      expect(runV2Migration).not.toHaveBeenCalled();
      expect(tenantClient.child).toHaveBeenCalledWith(MIGRATION_CLIENT_OPTIONS);
      const [{ value: migrationClient }] = tenantClient.child.mock.results;
      expect(runV3Migration).toHaveBeenCalledWith(
        expect.objectContaining({
          elasticsearchClient: migrationClient,
          esCapabilities: { serverless: true },
          inputs: expect.objectContaining({
            allowDowngrade: true,
            migrateDocuments,
            pickupUpdatedMappings,
          }),
        })
      );
    });

    it('never waits for another instance, even on nodes that would wait at startup', async () => {
      const migrator = new KibanaMigrator({
        ...mockOptions('v3'),
        waitForMigrationCompletion: true,
      });
      migrator.prepareMigrations();

      await migrator[method]({ client: createTenantClient().tenantClient });

      expect(runV3Migration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.objectContaining({ waitForMigrationCompletion: false, migrateDocuments }),
        })
      );
    });

    it('runs on every call, without updating the migrator status', async () => {
      const migrator = new KibanaMigrator(mockOptions('v3'));
      migrator.prepareMigrations();
      const statuses: string[] = [];
      migrator.getStatus$().subscribe(({ status }) => statuses.push(status));

      const { tenantClient } = createTenantClient();
      await migrator[method]({ client: tenantClient });
      await migrator[method]({ client: tenantClient });

      expect(runV3Migration).toHaveBeenCalledTimes(2);
      expect(statuses).toEqual(['waiting_to_start']);
    });

    it('rejects when the migration fails', async () => {
      const migrator = new KibanaMigrator(mockOptions('v3'));
      migrator.prepareMigrations();
      const fatal = new Error('Unable to complete saved object migrations');
      mockRunV3Migration.mockRejectedValueOnce(fatal);

      await expect(migrator[method]({ client: createTenantClient().tenantClient })).rejects.toBe(
        fatal
      );
    });

    it('only logs the intermediate steps on failures, when `useCumulativeLogger: true`', async () => {
      const options = mockOptions('v3');
      (options.soMigrationsConfig.useCumulativeLogger as boolean) = true; // casting because soMigrationsConfig are readonly
      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();
      const { tenantClient } = createTenantClient();
      mockRunV3Migration.mockImplementationOnce(async ({ logger }) => {
        logger.info('Migrating the tenant indices');
        return V3_SUCCESSFUL_MIGRATION_RESULT;
      });

      await migrator[method]({ client: tenantClient });
      expect(options.logger.info).not.toHaveBeenCalled();

      mockRunV3Migration.mockImplementationOnce(async ({ logger }) => {
        logger.info('Migrating the tenant indices');
        throw new Error('Unable to complete saved object migrations');
      });
      await expect(migrator[method]({ client: tenantClient })).rejects.toThrow();
      expect(options.logger.info).toHaveBeenCalledWith('Migrating the tenant indices');
    });
  });
});

const mockOptions = (algorithm: MigrationAlgorithm = 'v2'): KibanaMigratorOptions => {
  const mockedClient = elasticsearchClientMock.createElasticsearchClient();
  (mockedClient as any).child = jest.fn().mockImplementation(() => mockedClient);

  return {
    logger: loggingSystemMock.create().get(),
    kibanaVersion: '8.2.3',
    waitForMigrationCompletion: false,
    hashToVersionMap: {},
    typeRegistry: createRegistry([
      // typeRegistry depicts an updated index map:
      //   .my_index: ['testtype', 'testtype3'],
      //   .other_index: ['testtype2'],
      //   .task_index': ['testtasktype'],
      {
        name: 'testtype',
        hidden: false,
        namespaceType: 'single',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: { '8.2.3': jest.fn().mockImplementation((doc) => doc) },
      },
      {
        name: 'testtype2',
        hidden: false,
        namespaceType: 'single',
        // We are moving 'testtype2' from '.my_index' to '.other_index'
        indexPattern: '.other_index',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: {},
      },
      {
        name: 'testtasktype',
        hidden: false,
        namespaceType: 'single',
        indexPattern: '.task_index',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: {},
      },
      {
        // We are moving 'testtype3' from '.my_complementary_index' to '.my_index'
        name: 'testtype3',
        hidden: false,
        namespaceType: 'single',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: {},
      },
    ]),
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
      useCumulativeLogger: true,
    },
    client: mockedClient,
    docLinks: docLinksServiceMock.createSetupContract(),
    nodeRoles: { backgroundTasks: true, ui: true, migrator: true },
    esCapabilities: elasticsearchServiceMock.createCapabilities(),
  };
};
