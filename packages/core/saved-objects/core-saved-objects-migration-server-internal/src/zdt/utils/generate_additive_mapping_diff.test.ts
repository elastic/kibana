/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getBaseMappingsMock,
  getUpdatedRootFieldsMock,
} from './generate_additive_mapping_diff.test.mocks';

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import type { IndexMappingMeta, IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { generateAdditiveMappingDiff } from './generate_additive_mapping_diff';
import { getBaseMappings } from '../../core/build_active_mappings';
import { createType } from '../test_helpers';

describe('generateAdditiveMappingDiff', () => {
  const deletedTypes = ['deletedType'];

  const stubMigration = jest.fn();
  const stubModelVersion: SavedObjectsModelVersion = {
    changes: [{ type: 'mappings_addition', addedMappings: {} }],
  };

  beforeEach(() => {
    getBaseMappingsMock.mockReset().mockReturnValue({ properties: {} });
    getUpdatedRootFieldsMock.mockReset().mockReturnValue([]);
  });

  const getTypes = () => {
    const foo = createType({
      name: 'foo',
      switchToModelVersionAt: '8.0.0',
      modelVersions: {
        1: stubModelVersion,
        2: stubModelVersion,
      },
      mappings: { properties: { fooProp: { type: 'text' } } },
    });
    const bar = createType({
      name: 'bar',
      migrations: {
        '8.0.0': stubMigration,
        '8.5.0': stubMigration,
      },
      mappings: { properties: { barProp: { type: 'text' } } },
    });

    return { foo, bar };
  };

  const mappingFromMeta = (meta: IndexMappingMeta): IndexMapping => {
    return {
      properties: getBaseMappings().properties,
      _meta: meta,
    };
  };

  it('aggregates the mappings of the types with versions higher than in the index', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: '10.1.0',
        bar: '7.9.0',
      },
    };

    const addedMappings = generateAdditiveMappingDiff({
      types,
      mapping: mappingFromMeta(meta),
      deletedTypes,
    });

    expect(addedMappings).toEqual({
      foo: foo.mappings,
      bar: bar.mappings,
    });
  });

  it('ignores mapping from types already up to date', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: '10.1.0',
        bar: '8.5.0',
      },
    };

    const addedMappings = generateAdditiveMappingDiff({
      types,
      mapping: mappingFromMeta(meta),
      deletedTypes,
    });

    expect(addedMappings).toEqual({
      foo: foo.mappings,
    });
  });

  it('ignores deleted types', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: '10.1.0',
        bar: '8.2.0',
        deletedType: '10.2.0',
      },
    };

    const addedMappings = generateAdditiveMappingDiff({
      types,
      mapping: mappingFromMeta(meta),
      deletedTypes,
    });

    expect(addedMappings).toEqual({
      foo: foo.mappings,
      bar: bar.mappings,
    });
  });

  it('throws an error in case of version conflict', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: '10.1.0',
        bar: '10.1.0',
      },
    };

    expect(() =>
      generateAdditiveMappingDiff({
        types,
        mapping: mappingFromMeta(meta),
        deletedTypes,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot generate model version difference: conflict between versions"`
    );
  });

  it('throws an error if mappingVersions is not present on the index meta', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {};

    expect(() =>
      generateAdditiveMappingDiff({
        types,
        mapping: mappingFromMeta(meta),
        deletedTypes,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot generate additive mapping diff: mappingVersions not present on index meta"`
    );
  });

  it('throws an error if _meta is not present on the index', () => {
    expect(() =>
      generateAdditiveMappingDiff({
        types: [],
        mapping: {
          properties: {},
        },
        deletedTypes: [],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot generate additive mapping diff: meta not present on index"`
    );
  });

  it('includes the root fields that were added', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: '10.2.0',
        bar: '8.5.0',
      },
    };

    getBaseMappingsMock.mockReturnValue({
      properties: {
        rootA: { type: 'keyword' },
        rootB: { type: 'keyword' },
      },
    });
    getUpdatedRootFieldsMock.mockReturnValue(['rootA']);

    const addedMappings = generateAdditiveMappingDiff({
      types,
      mapping: mappingFromMeta(meta),
      deletedTypes,
    });

    expect(addedMappings).toEqual({
      rootA: { type: 'keyword' },
    });
  });

  it('includes the root fields that were modified', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: '10.2.0',
        bar: '8.5.0',
      },
    };

    getBaseMappingsMock.mockReturnValue({
      properties: {
        rootA: { type: 'keyword' },
        rootB: { type: 'keyword' },
        references: {
          type: 'nested',
          properties: {
            name: {
              type: 'keyword',
            },
            type: {
              type: 'keyword',
            },
            id: {
              type: 'keyword',
            },
          },
        },
      },
    });
    getUpdatedRootFieldsMock.mockReturnValue(['rootA', 'references']);

    const addedMappings = generateAdditiveMappingDiff({
      types,
      mapping: mappingFromMeta(meta),
      deletedTypes,
    });

    expect(addedMappings).toEqual({
      rootA: { type: 'keyword' },
      references: {
        type: 'nested',
        properties: {
          name: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
          },
          id: {
            type: 'keyword',
          },
        },
      },
    });
  });

  it('combines the changes from the types and from the root fields', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: '10.1.0',
        bar: '7.9.0',
      },
    };

    getBaseMappingsMock.mockReturnValue({
      properties: {
        rootA: { type: 'keyword' },
        rootB: { type: 'keyword' },
      },
    });
    getUpdatedRootFieldsMock.mockReturnValue(['rootA']);

    const addedMappings = generateAdditiveMappingDiff({
      types,
      mapping: mappingFromMeta(meta),
      deletedTypes,
    });

    expect(addedMappings).toEqual({
      foo: foo.mappings,
      bar: bar.mappings,
      rootA: { type: 'keyword' },
    });
  });
});
