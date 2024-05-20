/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SavedObjectsModelVersion,
  SavedObjectsModelChange,
} from '@kbn/core-saved-objects-server';
import { getVersionAddedMappings, getVersionAddedFields } from './version_mapping_changes';

const createVersion = (changes: SavedObjectsModelChange[]): SavedObjectsModelVersion => {
  return {
    changes,
  };
};

describe('getVersionAddedMappings', () => {
  it('returns empty mappings when the version has no changes', () => {
    const version = createVersion([]);
    expect(getVersionAddedMappings(version)).toEqual({});
  });

  it('returns empty mappings when the version has no `mappings_addition` changes', () => {
    const version = createVersion([
      {
        type: 'data_backfill',
        backfillFn: jest.fn(),
      },
    ]);
    expect(getVersionAddedMappings(version)).toEqual({});
  });

  it(`returns the change's mappings when the version has a single 'mappings_addition' changes`, () => {
    const version = createVersion([
      {
        type: 'data_backfill',
        backfillFn: jest.fn(),
      },
      {
        type: 'mappings_addition',
        addedMappings: {
          nested: {
            properties: {
              foo: { type: 'text' },
            },
          },
        },
      },
    ]);
    expect(getVersionAddedMappings(version)).toEqual({
      nested: {
        properties: {
          foo: { type: 'text' },
        },
      },
    });
  });

  it(`merges the mappings when the version has multiple 'mappings_addition' changes`, () => {
    const version = createVersion([
      {
        type: 'mappings_addition',
        addedMappings: {
          top: { type: 'text' },
          nested: {
            properties: {
              bar: { type: 'text' },
            },
          },
        },
      },
      {
        type: 'data_backfill',
        backfillFn: jest.fn(),
      },
      {
        type: 'mappings_addition',
        addedMappings: {
          nested: {
            properties: {
              foo: { type: 'text' },
            },
          },
        },
      },
    ]);
    expect(getVersionAddedMappings(version)).toEqual({
      top: { type: 'text' },
      nested: {
        properties: {
          foo: { type: 'text' },
          bar: { type: 'text' },
        },
      },
    });
  });
});

describe('getVersionAddedFields', () => {
  it('returns empty mappings when the version has no changes', () => {
    const version = createVersion([]);
    expect(getVersionAddedFields(version)).toEqual([]);
  });

  it('returns empty mappings when the version has no `mappings_addition` changes', () => {
    const version = createVersion([
      {
        type: 'data_backfill',
        backfillFn: jest.fn(),
      },
    ]);
    expect(getVersionAddedFields(version)).toEqual([]);
  });

  it(`returns the change's mappings when the version has a single 'mappings_addition' changes`, () => {
    const version = createVersion([
      {
        type: 'data_backfill',
        backfillFn: jest.fn(),
      },
      {
        type: 'mappings_addition',
        addedMappings: {
          nested: {
            properties: {
              foo: { type: 'text' },
            },
          },
        },
      },
    ]);
    expect(getVersionAddedFields(version)).toEqual(['nested', 'nested.foo']);
  });

  it(`merges the mappings when the version has multiple 'mappings_addition' changes`, () => {
    const version = createVersion([
      {
        type: 'mappings_addition',
        addedMappings: {
          top: { type: 'text' },
          nested: {
            properties: {
              bar: { type: 'text' },
            },
          },
        },
      },
      {
        type: 'data_backfill',
        backfillFn: jest.fn(),
      },
      {
        type: 'mappings_addition',
        addedMappings: {
          nested: {
            properties: {
              foo: { type: 'text' },
            },
          },
        },
      },
    ]);
    expect(getVersionAddedFields(version)).toEqual(['nested', 'nested.bar', 'nested.foo', 'top']);
  });
});
