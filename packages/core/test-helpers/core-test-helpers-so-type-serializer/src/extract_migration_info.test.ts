/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    it('returns the name from the SO type', () => {
      const type = createType({ name: 'my-type' });
      const output = extractMigrationInfo(type);
      expect(output.name).toEqual('my-type');
    });

    it('returns the namespaceType from the SO type', () => {
      const type = createType({ namespaceType: 'multiple-isolated' });
      const output = extractMigrationInfo(type);
      expect(output.namespaceType).toEqual('multiple-isolated');
    });

    it('returns the convertToMultiNamespaceTypeVersion from the SO type', () => {
      const type = createType({ convertToMultiNamespaceTypeVersion: '6.6.6' });
      const output = extractMigrationInfo(type);
      expect(output.convertToMultiNamespaceTypeVersion).toEqual('6.6.6');
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
});
