/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { extractMigrationInfo } from './extract_migration_info';

const createType = (parts: Partial<SavedObjectsType>): SavedObjectsType => ({
  name: 'test-type',
  hidden: false,
  namespaceType: 'multiple',
  mappings: { properties: {} },
  ...parts,
});

const dummyMigration = jest.fn();
const dummySchema = schema.object({});

describe('extractMigrationInfo', () => {
  describe('simple fields', () => {
    it('returns the `name` from the SO type', () => {
      const type = createType({ name: 'my-type' });
      const output = extractMigrationInfo(type);
      expect(output.name).toEqual('my-type');
    });

    it('returns the `namespaceType` from the SO type', () => {
      const type = createType({ namespaceType: 'multiple-isolated' });
      const output = extractMigrationInfo(type);
      expect(output.namespaceType).toEqual('multiple-isolated');
    });

    it('returns the `convertToMultiNamespaceTypeVersion` from the SO type', () => {
      const type = createType({ convertToMultiNamespaceTypeVersion: '6.6.6' });
      const output = extractMigrationInfo(type);
      expect(output.convertToMultiNamespaceTypeVersion).toEqual('6.6.6');
    });

    it('returns the `convertToAliasScript` from the SO type', () => {
      const type = createType({ convertToAliasScript: 'some_value' });
      const output = extractMigrationInfo(type);
      expect(output.convertToAliasScript).toEqual('some_value');
    });

    it('returns true for `hasExcludeOnUpgrade` if the SO type specifies `excludeOnUpgrade`', () => {
      expect(
        extractMigrationInfo(createType({ excludeOnUpgrade: jest.fn() })).hasExcludeOnUpgrade
      ).toEqual(true);
      expect(
        extractMigrationInfo(createType({ excludeOnUpgrade: undefined })).hasExcludeOnUpgrade
      ).toEqual(false);
    });
  });

  describe('migrations', () => {
    it('returns the versions with registered migrations, sorted asc', () => {
      const type = createType({
        migrations: {
          '8.3.3': dummyMigration,
          '7.17.7': dummyMigration,
          '8.0.2': dummyMigration,
        },
      });

      const output = extractMigrationInfo(type);

      expect(output.migrationVersions).toEqual(['7.17.7', '8.0.2', '8.3.3']);
    });

    it('supports migration provider functions', () => {
      const type = createType({
        migrations: () => ({
          '8.3.3': dummyMigration,
          '7.17.7': dummyMigration,
          '8.0.2': dummyMigration,
        }),
      });

      const output = extractMigrationInfo(type);

      expect(output.migrationVersions).toEqual(['7.17.7', '8.0.2', '8.3.3']);
    });

    it('returns an empty list when migrations are not defined', () => {
      const type = createType({
        migrations: undefined,
      });

      const output = extractMigrationInfo(type);

      expect(output.migrationVersions).toEqual([]);
    });
  });

  describe('schemas', () => {
    it('returns the versions with registered schemas, sorted asc', () => {
      const type = createType({
        schemas: {
          '8.3.2': dummySchema,
          '7.15.2': dummySchema,
          '8.1.2': dummySchema,
        },
      });

      const output = extractMigrationInfo(type);

      expect(output.schemaVersions).toEqual(['7.15.2', '8.1.2', '8.3.2']);
    });

    it('supports schema provider functions', () => {
      const type = createType({
        schemas: () => ({
          '8.3.2': dummySchema,
          '7.15.2': dummySchema,
          '8.1.2': dummySchema,
        }),
      });

      const output = extractMigrationInfo(type);

      expect(output.schemaVersions).toEqual(['7.15.2', '8.1.2', '8.3.2']);
    });

    it('returns an empty list when schemas are not defined', () => {
      const type = createType({
        schemas: undefined,
      });

      const output = extractMigrationInfo(type);

      expect(output.schemaVersions).toEqual([]);
    });
  });

  describe('mappings', () => {
    it('returns a flattened version of the mappings', () => {
      const type = createType({
        mappings: {
          dynamic: false,
          properties: {
            description: { type: 'text' },
            hits: { type: 'integer', index: false, doc_values: false },
          },
        },
      });
      const output = extractMigrationInfo(type);
      expect(output.mappings).toEqual({
        dynamic: false,
        'properties.description.type': 'text',
        'properties.hits.doc_values': false,
        'properties.hits.index': false,
        'properties.hits.type': 'integer',
      });
    });
  });

  describe('modelVersions', () => {
    it('returns a proper summary of the model versions', () => {
      const type = createType({
        modelVersions: {
          '1': {
            changes: [
              {
                type: 'data_backfill',
                backfillFn: jest.fn(),
              },
            ],
          },
          '2': {
            changes: [
              {
                type: 'mappings_addition',
                addedMappings: {
                  foo: {
                    type: 'boolean',
                  },
                },
              },
            ],
          },
        },
      });
      const output = extractMigrationInfo(type);

      expect(output.modelVersions).toEqual([
        {
          version: '1',
          changeTypes: ['data_backfill'],
          hasTransformation: true,
          modelVersionHash: '9d8366ac2d6d4c1e178eda7efbb59c09d466eb5f7691ac030adafbce4db8da9f',
          newMappings: [],
          schemas: {
            create: false,
            forwardCompatibility: false,
          },
        },
        {
          version: '2',
          changeTypes: ['mappings_addition'],
          hasTransformation: false,
          modelVersionHash: '50f6452c115c1de4e15985fbbabf98a8c3bd04def73a5cb3c4850c25172e8061',
          newMappings: ['foo.type'],
          schemas: {
            create: false,
            forwardCompatibility: false,
          },
        },
      ]);
    });

    it('supports provider functions', () => {
      const type = createType({
        modelVersions: () => ({
          '1': {
            changes: [
              {
                type: 'data_backfill',
                backfillFn: jest.fn(),
              },
            ],
          },
          '2': {
            changes: [
              {
                type: 'mappings_addition',
                addedMappings: {
                  foo: {
                    type: 'boolean',
                  },
                },
              },
            ],
          },
        }),
      });
      const output = extractMigrationInfo(type);

      expect(output.modelVersions).toEqual([
        {
          version: '1',
          changeTypes: ['data_backfill'],
          hasTransformation: true,
          modelVersionHash: '9d8366ac2d6d4c1e178eda7efbb59c09d466eb5f7691ac030adafbce4db8da9f',
          newMappings: [],
          schemas: {
            create: false,
            forwardCompatibility: false,
          },
        },
        {
          version: '2',
          changeTypes: ['mappings_addition'],
          hasTransformation: false,
          modelVersionHash: '50f6452c115c1de4e15985fbbabf98a8c3bd04def73a5cb3c4850c25172e8061',
          newMappings: ['foo.type'],
          schemas: {
            create: false,
            forwardCompatibility: false,
          },
        },
      ]);
    });

    it('returns the unique list of changes', () => {
      const type = createType({
        modelVersions: {
          '1': {
            changes: [
              {
                type: 'data_backfill',
                backfillFn: jest.fn(),
              },
              {
                type: 'unsafe_transform',
                transformFn: jest.fn(),
              },
              {
                type: 'data_removal',
                removedAttributePaths: [],
              },
              {
                type: 'data_backfill',
                backfillFn: jest.fn(),
              },
            ],
          },
        },
      });
      const output = extractMigrationInfo(type);

      expect(output.modelVersions).toEqual([
        {
          version: '1',
          changeTypes: ['data_backfill', 'data_removal', 'unsafe_transform'],
          hasTransformation: true,
          modelVersionHash: '9cd0fcc20655480bc520446b62b677f8af0c07eff6853553892be53fafc4a696',
          newMappings: [],
          schemas: {
            create: false,
            forwardCompatibility: false,
          },
        },
      ]);
    });

    it('returns an empty list when model versions are not defined', () => {
      const type = createType({
        modelVersions: undefined,
      });
      const output = extractMigrationInfo(type);

      expect(output.modelVersions).toEqual([]);
    });

    it('returns the correct values for schemas', () => {
      const typeSchemaV1 = schema.object({ title: schema.string() });
      const type = createType({
        modelVersions: {
          1: {
            changes: [],
            schemas: {
              forwardCompatibility: jest.fn(),
              create: typeSchemaV1,
            },
          },
          2: {
            changes: [],
            schemas: {},
          },
        },
      });
      const output = extractMigrationInfo(type);
      expect(output.modelVersions[0].schemas).toEqual({
        forwardCompatibility: 'c7c71ae951f0ac343cea0403bc34144ede93afec1bfe0ae6bd3279dd28ddf696',
        create: '7457866b52ceea9e20767b3337518de452b7790243891d81737d48eb8b3afd18',
      });
      expect(output.modelVersions[1].schemas).toEqual({
        forwardCompatibility: false,
        create: false,
      });
    });
  });

  describe('migrations and modelVersions', () => {
    it('generate properties for both', () => {
      const type = createType({
        migrations: {
          '8.3.3': dummyMigration,
          '7.17.7': dummyMigration,
          '8.0.2': dummyMigration,
        },
        modelVersions: {
          '1': {
            changes: [
              {
                type: 'data_backfill',
                backfillFn: jest.fn(),
              },
            ],
          },
          '2': {
            changes: [
              {
                type: 'mappings_addition',
                addedMappings: {
                  foo: {
                    type: 'boolean',
                  },
                },
              },
            ],
          },
        },
      });

      const output = extractMigrationInfo(type);

      expect(output).toEqual(
        expect.objectContaining({
          migrationVersions: ['7.17.7', '8.0.2', '8.3.3'],
          modelVersions: [
            {
              version: '1',
              changeTypes: ['data_backfill'],
              hasTransformation: true,
              modelVersionHash: '9d8366ac2d6d4c1e178eda7efbb59c09d466eb5f7691ac030adafbce4db8da9f',
              newMappings: [],
              schemas: {
                create: false,
                forwardCompatibility: false,
              },
            },
            {
              version: '2',
              changeTypes: ['mappings_addition'],
              hasTransformation: false,
              modelVersionHash: '50f6452c115c1de4e15985fbbabf98a8c3bd04def73a5cb3c4850c25172e8061',
              newMappings: ['foo.type'],
              schemas: {
                create: false,
                forwardCompatibility: false,
              },
            },
          ],
        })
      );
    });
  });
});
