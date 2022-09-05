/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { createIndexMap } from './build_index_map';

const createRegistry = (...types: Array<Partial<SavedObjectsType>>) => {
  const registry = new SavedObjectTypeRegistry();
  types.forEach((type) =>
    registry.registerType({
      name: 'unknown',
      namespaceType: 'single',
      hidden: false,
      mappings: { properties: {} },
      migrations: {},
      ...type,
    })
  );
  return registry;
};

test('mappings without index pattern goes to default index', () => {
  const result = createIndexMap({
    kibanaIndexName: '.kibana',
    registry: createRegistry({
      name: 'type1',
      namespaceType: 'single',
    }),
    indexMap: {
      type1: {
        properties: {
          field1: {
            type: 'text',
          },
        },
      },
    },
  });
  expect(result).toEqual({
    '.kibana': {
      typeMappings: {
        type1: {
          properties: {
            field1: {
              type: 'text',
            },
          },
        },
      },
    },
  });
});

test(`mappings with custom index pattern doesn't go to default index`, () => {
  const result = createIndexMap({
    kibanaIndexName: '.kibana',
    registry: createRegistry({
      name: 'type1',
      namespaceType: 'single',
      indexPattern: '.other_kibana',
    }),
    indexMap: {
      type1: {
        properties: {
          field1: {
            type: 'text',
          },
        },
      },
    },
  });
  expect(result).toEqual({
    '.other_kibana': {
      typeMappings: {
        type1: {
          properties: {
            field1: {
              type: 'text',
            },
          },
        },
      },
    },
  });
});

test('creating a script gets added to the index pattern', () => {
  const result = createIndexMap({
    kibanaIndexName: '.kibana',
    registry: createRegistry({
      name: 'type1',
      namespaceType: 'single',
      indexPattern: '.other_kibana',
      convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id`,
    }),
    indexMap: {
      type1: {
        properties: {
          field1: {
            type: 'text',
          },
        },
      },
    },
  });
  expect(result).toEqual({
    '.other_kibana': {
      script: `ctx._id = ctx._source.type + ':' + ctx._id`,
      typeMappings: {
        type1: {
          properties: {
            field1: {
              type: 'text',
            },
          },
        },
      },
    },
  });
});

test('throws when two scripts are defined for an index pattern', () => {
  const defaultIndex = '.kibana';
  const registry = createRegistry(
    {
      name: 'type1',
      namespaceType: 'single',
      convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id`,
    },
    {
      name: 'type2',
      namespaceType: 'single',
      convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id`,
    }
  );

  const indexMap = {
    type1: {
      properties: {
        field1: {
          type: 'text',
        },
      },
    },
    type2: {
      properties: {
        field1: {
          type: 'text',
        },
      },
    },
  } as const;
  expect(() =>
    createIndexMap({
      kibanaIndexName: defaultIndex,
      registry,
      indexMap,
    })
  ).toThrowErrorMatchingInlineSnapshot(
    `"convertToAliasScript has been defined more than once for index pattern \\".kibana\\""`
  );
});
