/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as filterTransformModule from '@kbn/as-code-filters-transforms';
import * as sharedTransformsModule from '@kbn/as-code-shared-transforms';
jest.mock('@kbn/as-code-filters-transforms', () => {
  return {
    __esModule: true,
    ...jest.requireActual('@kbn/as-code-filters-transforms'),
  };
});
jest.mock('@kbn/as-code-shared-transforms', () => {
  return {
    __esModule: true,
    ...jest.requireActual('@kbn/as-code-shared-transforms'),
  };
});

import { getDashboardStateSchema } from '../../dashboard_state_schemas';
import { transformSearchSourceOut } from './transform_search_source_out';

jest.mock('../../../kibana_services', () => ({
  logger: { warn: jest.fn() },
}));

describe('transformSearchSourceOut', () => {
  const references = [
    {
      name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      type: 'index-pattern',
      id: 'fizzle-1234',
    },
  ];

  it('returns converted filters and query for valid input', () => {
    const meta = {
      searchSourceJSON: JSON.stringify({
        filter: [
          {
            query: { foo: 'bar' },
            meta: { indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' },
          },
        ],
        query: { query: 'test', language: 'kuery' },
      }),
    };
    const result = transformSearchSourceOut(meta, references, getDashboardStateSchema(false));
    expect(result).toEqual({
      filters: [{ data_view_id: 'fizzle-1234', type: 'dsl', dsl: { query: { foo: 'bar' } } }],
      query: { expression: 'test', language: 'kql' },
      warnings: [],
    });
  });

  it('drops any invalid filters', () => {
    const spy = jest
      .spyOn(filterTransformModule, 'fromStoredFilter')
      .mockImplementation((val: any) => {
        // `fromStoredFilter` is **too** type safe so we have to allow invalid filters through
        return val;
      });

    const meta = {
      searchSourceJSON: JSON.stringify({
        filter: [
          { type: 'condition', condition: { field: 'valid', operator: 'is', value: true } },
          {
            invalidFilter: true,
          },
          {
            anotherInvalidFilter: 'yup',
          },
        ],
      }),
    };
    const result = transformSearchSourceOut(meta, references, getDashboardStateSchema(false));

    expect(result).toEqual({
      filters: [{ type: 'condition', condition: { field: 'valid', operator: 'is', value: true } }],
      query: undefined,
      warnings: [
        {
          type: 'dropped_property',
          key: 'filters',
          message:
            'Unexpected error transforming filter state on read. Errors: [[filters.1]: "type" property is required, [filters.2]: "type" property is required]',
          value: [{ invalidFilter: true }, { anotherInvalidFilter: 'yup' }],
        },
      ],
    });

    spy.mockRestore();
  });

  it('returns empty object if searchSourceJSON is missing', () => {
    expect(transformSearchSourceOut({}, [], getDashboardStateSchema(false))).toEqual({
      warnings: [],
    });
  });

  it('returns empty object if parseSearchSourceJSON throws', () => {
    const meta = { searchSourceJSON: 'not json' };
    expect(transformSearchSourceOut(meta, [], getDashboardStateSchema(false))).toEqual({
      warnings: [],
    });
  });

  it('falls back to no data_view_id injectReferences throws', () => {
    const meta = {
      searchSourceJSON: JSON.stringify({
        filter: [{ query: { foo: 'bar' }, meta: { indexRefName: 'does-not-exist' } }],
        query: { query: 'test', language: 'kuery' },
      }),
    };
    const result = transformSearchSourceOut(meta, [], getDashboardStateSchema(false));
    expect(result).toEqual({
      filters: [{ type: 'dsl', dsl: { query: { foo: 'bar' } } }],
      query: { expression: 'test', language: 'kql' },
      warnings: [],
    });
  });

  it('drops invalid query', () => {
    jest.spyOn(sharedTransformsModule, 'toAsCodeQuery').mockImplementationOnce((val: any) => {
      // `toAsCodeQuery` is **too** type safe so we have to allow invalid query through
      return val;
    });
    const meta = {
      searchSourceJSON: JSON.stringify({
        query: { query: { invalid: true } },
      }),
    };
    const result = transformSearchSourceOut(meta, references, getDashboardStateSchema(false));
    expect(result).toEqual({
      filters: [],
      query: undefined,
      warnings: [
        {
          type: 'dropped_property',
          key: 'query',
          message:
            "Unexpected error transforming query state on read. Error: [query.query]: Additional properties are not allowed ('query' was unexpected)",
          value: { language: 'lucene', query: { query: { invalid: true } } },
        },
      ],
    });
  });
});
