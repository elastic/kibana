/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MigrationResult } from '@kbn/core-saved-objects-base-server-internal';
import {
  SavedObjectTypeRegistry,
  SavedObjectsSerializer,
} from '@kbn/core-saved-objects-base-server-internal';
import { DocumentMigrator } from '../document_migrator';
import type { MigrationContext } from './context';
import { migrateIndex } from './migrate_index';
import { runV3Migration } from './run_v3_migration';
import {
  CLASSIC_INPUTS,
  KIBANA_VERSION,
  createMigrationConfig,
  createTestTypes,
} from './test_helpers/context';

jest.mock('../low_memory', () => ({
  ...jest.requireActual('../low_memory'),
  isMemoryConstrained: () => false,
}));
jest.mock('./migrate_index');

const migrateIndexMock = migrateIndex as jest.MockedFunction<typeof migrateIndex>;

const patched = (destIndex: string): MigrationResult => ({
  status: 'patched',
  destIndex,
  elapsedMs: 1,
});

describe('runV3Migration', () => {
  const logger = loggingSystemMock.createLogger();

  const run = (migrationConfig = createMigrationConfig()) => {
    const typeRegistry = new SavedObjectTypeRegistry();
    const [foo, bar] = createTestTypes();
    typeRegistry.registerType(foo);
    typeRegistry.registerType({ ...bar, indexPattern: '.kibana_other' });
    const documentMigrator = new DocumentMigrator({
      typeRegistry,
      kibanaVersion: KIBANA_VERSION,
      convertVersion: '8.0.0',
      log: logger,
    });
    documentMigrator.prepareMigrations();
    return runV3Migration({
      inputs: CLASSIC_INPUTS,
      kibanaIndexPrefix: '.kibana',
      kibanaVersion: KIBANA_VERSION,
      typeRegistry,
      documentMigrator,
      serializer: new SavedObjectsSerializer(typeRegistry),
      migrationConfig,
      docLinks: docLinksServiceMock.createStartContract(),
      elasticsearchClient: elasticsearchClientMock.createElasticsearchClient(),
      esCapabilities: { serverless: false },
      logger,
    });
  };

  /** Fails the `.kibana` migration, and lets the test decide when the other index completes. */
  const failKibanaIndex = () => {
    let completeOther: () => void = () => {};
    migrateIndexMock.mockImplementation(({ context }: { context: MigrationContext }) =>
      context.indexPrefix === '.kibana'
        ? Promise.reject(new Error('boom'))
        : new Promise((resolve) => {
            completeOther = () => resolve(patched(context.indexPrefix));
          })
    );
    return () => completeOther();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('migrates every index', async () => {
    migrateIndexMock.mockImplementation(({ context }) =>
      Promise.resolve(patched(context.indexPrefix))
    );

    await expect(run()).resolves.toEqual([patched('.kibana'), patched('.kibana_other')]);
  });

  it('only fails once every index migration has settled', async () => {
    const completeOther = failKibanaIndex();
    let settled = false;
    const migration = run().finally(() => {
      settled = true;
    });

    await new Promise(setImmediate);
    expect(settled).toBe(false);

    completeOther();
    await expect(migration).rejects.toThrow('boom');
  });

  it('reports the failures of every index', async () => {
    migrateIndexMock.mockImplementation(({ context }) =>
      Promise.reject(new Error(`${context.indexPrefix} failed`))
    );

    await expect(run()).rejects.toThrow('.kibana failed\n.kibana_other failed');
  });

  it('warns when a discard flag targets another Kibana version', async () => {
    migrateIndexMock.mockImplementation(({ context }) =>
      Promise.resolve(patched(context.indexPrefix))
    );

    await run(createMigrationConfig({ discardUnknownObjects: '9.3.0' }));

    expect(logger.warn).toHaveBeenCalledWith(
      'The flag `migrations.discardUnknownObjects` is defined but does not match the current kibana version; unknown objects will NOT be discarded.'
    );
  });
});
