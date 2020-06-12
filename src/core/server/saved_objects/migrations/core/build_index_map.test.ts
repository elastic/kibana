/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createIndexMap } from './build_index_map';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectsType } from '../../types';

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
            type: 'string',
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
              type: 'string',
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
            type: 'string',
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
              type: 'string',
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
            type: 'string',
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
              type: 'string',
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
          type: 'string',
        },
      },
    },
    type2: {
      properties: {
        field1: {
          type: 'string',
        },
      },
    },
  };
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
