/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type {
  SavedObjectsRawDocSource,
  SavedObjectsType,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';

import '../jest_matchers';
import {
  clearLog,
  defaultKibanaIndex,
  startElasticsearch,
  KibanaMigratorTestKit,
  getKibanaMigratorTestKit,
} from '../kibana_migrator_test_kit';

describe('deferred migrations', () => {
  let client: KibanaMigratorTestKit['client'];
  let runMigrations: KibanaMigratorTestKit['runMigrations'];
  let savedObjectsRepository: KibanaMigratorTestKit['savedObjectsRepository'];
  let server: TestElasticsearchUtils['es'];
  let type: SavedObjectsType;

  beforeAll(async () => {
    server = await startElasticsearch();
  });

  afterAll(async () => {
    await server?.stop();
  });

  beforeEach(async () => {
    const noop = (doc: SavedObjectUnsanitizedDoc) => doc;

    type = {
      name: 'some-type',
      hidden: false,
      namespaceType: 'agnostic',
      mappings: {
        properties: {
          name: { type: 'keyword' },
        },
      },
      migrations: {
        '1.0.0': jest.fn(noop),
        '2.0.0': jest.fn(noop),
        '3.0.0': {
          // @ts-expect-error
          deferred: true,
          transform: jest.fn(noop),
        },
        '4.0.0': jest.fn(noop),
        '5.0.0': {
          // @ts-expect-error
          deferred: true,
          transform: jest.fn(noop),
        },
        '6.0.0': {
          // @ts-expect-error
          deferred: true,
          transform: jest.fn(noop),
        },
      },
    };

    ({ client, runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
      kibanaIndex: defaultKibanaIndex,
      types: [type],
    }));
    await clearLog();
  });

  describe.each`
    source     | expected
    ${'1.0.0'} | ${'6.0.0'}
    ${'2.0.0'} | ${'6.0.0'}
    ${'3.0.0'} | ${'6.0.0'}
    ${'4.0.0'} | ${'4.0.0'}
    ${'5.0.0'} | ${'5.0.0'}
    ${'6.0.0'} | ${'6.0.0'}
  `("when source document version is '$source'", ({ source, expected }) => {
    let id: string;
    let latestVersion: string;

    beforeEach(async () => {
      id = `${type.name}:test-document-${source}`;
      latestVersion = Object.keys(type.migrations!).sort().pop()!;

      await client.create<SavedObjectsRawDocSource>({
        id: `${type.name}:${id}`,
        index: defaultKibanaIndex,
        refresh: 'wait_for',
        document: {
          type: type.name,
          references: [],
          typeMigrationVersion: source,
          coreMigrationVersion: '7.0.0',
        },
      });
      await runMigrations();
    });

    afterEach(async () => {
      await client.delete({
        id: `${type.name}:${id}`,
        index: defaultKibanaIndex,
        refresh: 'wait_for',
      });
    });

    it(`should migrate to '${expected}'`, async () => {
      await expect(
        client.get({
          id: `${type.name}:${id}`,
          index: defaultKibanaIndex,
        })
      ).resolves.toHaveProperty('_source.typeMigrationVersion', expected);
    });

    it('should return the latest version via `repository.get`', async () => {
      await expect(savedObjectsRepository.get(type.name, id)).resolves.toHaveProperty(
        'typeMigrationVersion',
        latestVersion
      );
    });

    it('should return the latest version via `repository.bulkGet`', async () => {
      await expect(
        savedObjectsRepository.bulkGet([{ id, type: type.name }])
      ).resolves.toHaveProperty('saved_objects.0.typeMigrationVersion', latestVersion);
    });

    it('should return the latest version via `repository.resolve`', async () => {
      await expect(savedObjectsRepository.resolve(type.name, id)).resolves.toHaveProperty(
        'saved_object.typeMigrationVersion',
        latestVersion
      );
    });

    it('should return the latest version via `repository.bulkResolve`', async () => {
      await expect(
        savedObjectsRepository.bulkResolve([{ id, type: type.name }])
      ).resolves.toHaveProperty(
        'resolved_objects.0.saved_object.typeMigrationVersion',
        latestVersion
      );
    });

    it('should return the latest version via `repository.find`', async () => {
      await expect(savedObjectsRepository.find({ type: type.name })).resolves.toHaveProperty(
        'saved_objects.0.typeMigrationVersion',
        latestVersion
      );
    });
  });
});
