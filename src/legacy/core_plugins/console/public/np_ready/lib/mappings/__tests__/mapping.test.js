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
import '../../../application/models/sense_editor/sense_editor.test.mocks';
const mappings = require('../mappings');

describe('Mappings', () => {
  beforeEach(() => {
    mappings.clear();
  });
  afterEach(() => {
    mappings.clear();
  });

  function fc(f1, f2) {
    if (f1.name < f2.name) {
      return -1;
    }
    if (f1.name > f2.name) {
      return 1;
    }
    return 0;
  }

  function f(name, type) {
    return { name: name, type: type || 'string' };
  }

  test('Multi fields 1.0 style', function () {
    mappings.loadMappings({
      index: {
        properties: {
          first_name: {
            type: 'string',
            index: 'analyzed',
            path: 'just_name',
            fields: {
              any_name: { type: 'string', index: 'analyzed' },
            },
          },
          last_name: {
            type: 'string',
            index: 'no',
            fields: {
              raw: { type: 'string', index: 'analyzed' },
            },
          },
        },
      },
    });

    expect(mappings.getFields('index').sort(fc)).toEqual([
      f('any_name', 'string'),
      f('first_name', 'string'),
      f('last_name', 'string'),
      f('last_name.raw', 'string'),
    ]);
  });

  test('Simple fields', function () {
    mappings.loadMappings({
      index: {
        properties: {
          str: {
            type: 'string',
          },
          number: {
            type: 'int',
          },
        },
      },
    });

    expect(mappings.getFields('index').sort(fc)).toEqual([
      f('number', 'int'),
      f('str', 'string'),
    ]);
  });

  test('Simple fields - 1.0 style', function () {
    mappings.loadMappings({
      index: {
        mappings: {
          properties: {
            str: {
              type: 'string',
            },
            number: {
              type: 'int',
            },
          },
        },
      },
    });

    expect(mappings.getFields('index').sort(fc)).toEqual([
      f('number', 'int'),
      f('str', 'string'),
    ]);
  });

  test('Nested fields', function () {
    mappings.loadMappings({
      index: {
        properties: {
          person: {
            type: 'object',
            properties: {
              name: {
                properties: {
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                },
              },
              sid: { type: 'string', index: 'not_analyzed' },
            },
          },
          message: { type: 'string' },
        },
      },
    });

    expect(mappings.getFields('index', []).sort(fc)).toEqual([
      f('message'),
      f('person.name.first_name'),
      f('person.name.last_name'),
      f('person.sid'),
    ]);
  });

  test('Enabled fields', function () {
    mappings.loadMappings({
      index: {
        properties: {
          person: {
            type: 'object',
            properties: {
              name: {
                type: 'object',
                enabled: false,
              },
              sid: { type: 'string', index: 'not_analyzed' },
            },
          },
          message: { type: 'string' },
        },
      },
    });

    expect(mappings.getFields('index', []).sort(fc)).toEqual([
      f('message'),
      f('person.sid'),
    ]);
  });

  test('Path tests', function () {
    mappings.loadMappings({
      index: {
        properties: {
          name1: {
            type: 'object',
            path: 'just_name',
            properties: {
              first1: { type: 'string' },
              last1: { type: 'string', index_name: 'i_last_1' },
            },
          },
          name2: {
            type: 'object',
            path: 'full',
            properties: {
              first2: { type: 'string' },
              last2: { type: 'string', index_name: 'i_last_2' },
            },
          },
        },
      },
    });

    expect(mappings.getFields().sort(fc)).toEqual([
      f('first1'),
      f('i_last_1'),
      f('name2.first2'),
      f('name2.i_last_2'),
    ]);
  });

  test('Use index_name tests', function () {
    mappings.loadMappings({
      index: {
        properties: {
          last1: { type: 'string', index_name: 'i_last_1' },
        },
      },
    });

    expect(mappings.getFields().sort(fc)).toEqual([f('i_last_1')]);
  });

  test('Aliases', function () {
    mappings.loadAliases({
      test_index1: {
        aliases: {
          alias1: {},
        },
      },
      test_index2: {
        aliases: {
          alias2: {
            filter: {
              term: {
                FIELD: 'VALUE',
              },
            },
          },
          alias1: {},
        },
      },
    });
    mappings.loadMappings({
      test_index1: {
        properties: {
          last1: { type: 'string', index_name: 'i_last_1' },
        },
      },
      test_index2: {
        properties: {
          last1: { type: 'string', index_name: 'i_last_1' },
        },
      },
    });

    expect(mappings.getIndices().sort()).toEqual([
      '_all',
      'alias1',
      'alias2',
      'test_index1',
      'test_index2',
    ]);
    expect(mappings.getIndices(false).sort()).toEqual([
      'test_index1',
      'test_index2',
    ]);
    expect(mappings.expandAliases(['alias1', 'test_index2']).sort()).toEqual([
      'test_index1',
      'test_index2',
    ]);
    expect(mappings.expandAliases('alias2')).toEqual('test_index2');
  });
});
