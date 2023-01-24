/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { getMigrationHash } from './get_migration_hash';

const createType = (parts: Partial<SavedObjectsType> = {}): SavedObjectsType => ({
  name: 'test-type',
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    dynamic: false,
    properties: {
      description: { type: 'text' },
      hits: { type: 'integer', index: false, doc_values: false },
    },
  },
  ...parts,
});

describe('getMigrationHash', () => {
  it('returns the same hash for the exact same simple type', () => {
    const type = createType();
    expect(getMigrationHash(type)).toEqual(getMigrationHash(type));
  });

  describe('simple fields', () => {
    it('returns different hashes if `name` changes', () => {
      expect(getMigrationHash(createType({ name: 'typeA' }))).not.toEqual(
        getMigrationHash(createType({ name: 'typeB' }))
      );
    });
    it('returns different hashes if `namespaceType` changes', () => {
      expect(getMigrationHash(createType({ namespaceType: 'single' }))).not.toEqual(
        getMigrationHash(createType({ namespaceType: 'multiple' }))
      );
    });
    it('returns different hashes if `convertToMultiNamespaceTypeVersion` changes', () => {
      expect(
        getMigrationHash(createType({ convertToMultiNamespaceTypeVersion: undefined }))
      ).not.toEqual(getMigrationHash(createType({ convertToMultiNamespaceTypeVersion: '6.6.6' })));
    });
    it('returns different hashes if `convertToAliasScript` changes', () => {
      expect(getMigrationHash(createType({ convertToAliasScript: undefined }))).not.toEqual(
        getMigrationHash(createType({ convertToAliasScript: 'some_script' }))
      );
    });
    it('returns different hashes if `excludeOnUpgrade` is defined or not', () => {
      expect(getMigrationHash(createType({ excludeOnUpgrade: undefined }))).not.toEqual(
        getMigrationHash(createType({ excludeOnUpgrade: jest.fn() }))
      );
    });
  });

  describe('migrations', () => {
    it('returns same hash if same migration versions are registered', () => {
      const typeA = createType({
        migrations: {
          '7.17.1': jest.fn(),
          '8.4.2': jest.fn(),
        },
      });
      const typeB = createType({
        migrations: {
          '7.17.1': jest.fn(),
          '8.4.2': jest.fn(),
        },
      });

      expect(getMigrationHash(typeA)).toEqual(getMigrationHash(typeB));
    });

    it('returns same hash if same migration versions are registered in different order', () => {
      const typeA = createType({
        migrations: {
          '9.1.3': jest.fn(),
          '7.17.1': jest.fn(),
          '8.4.2': jest.fn(),
        },
      });
      const typeB = createType({
        migrations: {
          '8.4.2': jest.fn(),
          '9.1.3': jest.fn(),
          '7.17.1': jest.fn(),
        },
      });

      expect(getMigrationHash(typeA)).toEqual(getMigrationHash(typeB));
    });

    it('returns same hash if same migration versions are registered using record + function', () => {
      const typeA = createType({
        migrations: {
          '9.1.3': jest.fn(),
          '7.17.1': jest.fn(),
          '8.4.2': jest.fn(),
        },
      });
      const typeB = createType({
        migrations: () => ({
          '8.4.2': jest.fn(),
          '9.1.3': jest.fn(),
          '7.17.1': jest.fn(),
        }),
      });

      expect(getMigrationHash(typeA)).toEqual(getMigrationHash(typeB));
    });

    it('returns different hashes if different migration versions are registered', () => {
      const typeA = createType({
        migrations: {
          '7.17.1': jest.fn(),
          '8.4.2': jest.fn(),
        },
      });
      const typeB = createType({
        migrations: {
          '7.17.69': jest.fn(),
          '42.0.0': jest.fn(),
        },
      });

      expect(getMigrationHash(typeA)).not.toEqual(getMigrationHash(typeB));
    });
  });
  describe('schemas', () => {
    it('returns same hash if same schema versions are registered', () => {
      const typeA = createType({
        schemas: {
          '7.17.1': schema.object({}),
          '8.4.2': schema.object({}),
        },
      });
      const typeB = createType({
        schemas: {
          '7.17.1': schema.object({}),
          '8.4.2': schema.object({}),
        },
      });

      expect(getMigrationHash(typeA)).toEqual(getMigrationHash(typeB));
    });

    it('returns same hash if same schema versions are registered in different order', () => {
      const typeA = createType({
        schemas: {
          '9.1.3': schema.object({}),
          '7.17.1': schema.object({}),
          '8.4.2': schema.object({}),
        },
      });
      const typeB = createType({
        schemas: {
          '8.4.2': schema.object({}),
          '9.1.3': schema.object({}),
          '7.17.1': schema.object({}),
        },
      });

      expect(getMigrationHash(typeA)).toEqual(getMigrationHash(typeB));
    });

    it('returns same hash if same schema versions are registered using record + function', () => {
      const typeA = createType({
        schemas: {
          '9.1.3': schema.object({}),
          '7.17.1': schema.object({}),
          '8.4.2': schema.object({}),
        },
      });
      const typeB = createType({
        schemas: () => ({
          '8.4.2': schema.object({}),
          '9.1.3': schema.object({}),
          '7.17.1': schema.object({}),
        }),
      });

      expect(getMigrationHash(typeA)).toEqual(getMigrationHash(typeB));
    });

    it('returns different hashes if different schema versions are registered', () => {
      const typeA = createType({
        schemas: {
          '7.17.1': schema.object({}),
          '8.4.2': schema.object({}),
        },
      });
      const typeB = createType({
        schemas: {
          '7.17.69': schema.object({}),
          '42.0.0': schema.object({}),
        },
      });

      expect(getMigrationHash(typeA)).not.toEqual(getMigrationHash(typeB));
    });
  });

  describe('mappings', () => {
    it('returns same hash for the same mappings', () => {
      const typeA = createType({
        mappings: {
          dynamic: false,
          properties: {
            description: { type: 'text' },
            hits: { type: 'integer', index: false, doc_values: false },
          },
        },
      });
      const typeB = createType({
        mappings: {
          dynamic: false,
          properties: {
            description: { type: 'text' },
            hits: { type: 'integer', index: false, doc_values: false },
          },
        },
      });

      expect(getMigrationHash(typeA)).toEqual(getMigrationHash(typeB));
    });

    it('returns same hash for the same mappings in different order', () => {
      const typeA = createType({
        mappings: {
          dynamic: false,
          properties: {
            hits: { type: 'integer', index: false, doc_values: false },
            description: { type: 'text' },
          },
        },
      });
      const typeB = createType({
        mappings: {
          properties: {
            description: { type: 'text' },
            hits: { index: false, type: 'integer', doc_values: false },
          },
          dynamic: false,
        },
      });

      expect(getMigrationHash(typeA)).toEqual(getMigrationHash(typeB));
    });

    it('returns different hashes for different mappings (removing nested property)', () => {
      const typeA = createType({
        mappings: {
          dynamic: false,
          properties: {
            description: { type: 'text' },
            hits: { type: 'integer', index: false, doc_values: false },
          },
        },
      });
      const typeB = createType({
        mappings: {
          dynamic: false,
          properties: {
            description: { type: 'text' },
            hits: { type: 'integer', doc_values: false },
          },
        },
      });

      expect(getMigrationHash(typeA)).not.toEqual(getMigrationHash(typeB));
    });

    it('returns different hashes for different mappings (adding nested property)', () => {
      const typeA = createType({
        mappings: {
          dynamic: false,
          properties: {
            description: { type: 'text' },
            hits: { type: 'integer', index: false, doc_values: false },
          },
        },
      });
      const typeB = createType({
        mappings: {
          dynamic: false,
          properties: {
            description: { type: 'text', boost: 42 },
            hits: { type: 'integer', index: false, doc_values: false },
          },
        },
      });

      expect(getMigrationHash(typeA)).not.toEqual(getMigrationHash(typeB));
    });

    it('returns different hashes for different mappings (removing top-level property)', () => {
      const typeA = createType({
        mappings: {
          dynamic: false,
          properties: {
            description: { type: 'text' },
            hits: { type: 'integer', index: false, doc_values: false },
          },
        },
      });
      const typeB = createType({
        mappings: {
          properties: {
            description: { type: 'text' },
            hits: { type: 'integer', index: false, doc_values: false },
          },
        },
      });

      expect(getMigrationHash(typeA)).not.toEqual(getMigrationHash(typeB));
    });
  });

  describe('ignored fields', () => {
    it('returns same hash if `hidden` changes', () => {
      expect(getMigrationHash(createType({ hidden: false }))).toEqual(
        getMigrationHash(createType({ hidden: true }))
      );
    });
    it('returns same hash if `management` changes', () => {
      expect(getMigrationHash(createType({ management: undefined }))).toEqual(
        getMigrationHash(createType({ management: { visibleInManagement: false } }))
      );
    });
  });
});
