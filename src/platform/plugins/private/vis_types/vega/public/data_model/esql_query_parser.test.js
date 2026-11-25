/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { ESQLVariableType } from '@kbn/esql-types';
import { getESQLTimeField } from '@kbn/esql-utils';
import { EsqlQueryParser } from './esql_query_parser';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLTimeField: jest.fn(),
}));

const rangeStart = 1000000;
const rangeEnd = 2000000;

const mockFilters = {
  bool: {
    must: [{ match_all: {} }],
    filter: [{ range: { '@timestamp': { gte: '2024-01-01', lte: '2024-12-31' } } }],
  },
};

function createParser(min = rangeStart, max = rangeEnd, dashboardCtx = {}, esqlVariables) {
  const timeCache = {
    getTimeBounds: () => ({ min, max }),
  };

  const searchAPI = {
    searchEsql: jest.fn(() => of([])),
  };

  const onWarning = jest.fn();

  const parser = new EsqlQueryParser(timeCache, searchAPI, dashboardCtx, onWarning, esqlVariables);
  parser.$$$warnCount = 0;
  parser._onWarning = (...args) => {
    parser.$$$warnCount++;
    onWarning(...args);
  };

  return { parser, searchAPI, onWarning };
}

jest.mock('../services', () => ({
  getHttp: jest.fn(() => ({})),
}));

beforeEach(() => {
  getESQLTimeField.mockReset();
  getESQLTimeField.mockResolvedValue(undefined);
});

describe('EsqlQueryParser.parseUrl', () => {
  test('should parse basic ES|QL query', () => {
    const { parser } = createParser();
    const dataObject = { name: 'test' };
    const url = {
      '%type%': 'esql',
      query: 'FROM logs-* | STATS count=COUNT()',
    };

    const result = parser.parseUrl(dataObject, url);

    expect(result.dataObject).toBe(dataObject);
    expect(result.url.query).toBe('FROM logs-* | STATS count=COUNT()');
    expect(result.url.dropNullColumns).toBe(true);
  });

  test('should throw error when query is missing', () => {
    const { parser } = createParser();
    const dataObject = { name: 'test' };
    const url = {
      '%type%': 'esql',
    };

    expect(() => parser.parseUrl(dataObject, url)).toThrow(/requires a.*query.*parameter/);
  });

  test('should throw error when query is not a string', () => {
    const { parser } = createParser();
    const dataObject = { name: 'test' };
    const url = {
      '%type%': 'esql',
      query: { invalid: 'object' },
    };

    expect(() => parser.parseUrl(dataObject, url)).toThrow(/requires a.*query.*parameter/);
  });

  test('should throw error when query is empty', () => {
    const { parser } = createParser();
    const dataObject = { name: 'test' };
    const url = {
      '%type%': 'esql',
      query: '   ',
    };

    expect(() => parser.parseUrl(dataObject, url)).toThrow(/cannot be empty/);
  });

  test('should handle %context% flag', () => {
    const { parser } = createParser(rangeStart, rangeEnd, mockFilters);
    const dataObject = { name: 'test' };
    const url = {
      '%type%': 'esql',
      '%context%': true,
      query: 'FROM logs-* | STATS count=COUNT()',
    };

    const result = parser.parseUrl(dataObject, url);

    expect(result.url.filter).toEqual(mockFilters);
    expect(result.url['%context%']).toBeUndefined();
  });

  test('should handle %timefield% parameter', () => {
    const { parser } = createParser();
    const dataObject = { name: 'test' };
    const url = {
      '%type%': 'esql',
      '%timefield%': '@timestamp',
      query: 'FROM logs-* | WHERE @timestamp >= ?_tstart',
    };

    const result = parser.parseUrl(dataObject, url);

    expect(result.url._timeFieldDirective).toBe('@timestamp');
    expect(result.url['%timefield%']).toBeUndefined();
  });

  test('should set dropNullColumns to true by default', () => {
    const { parser } = createParser();
    const dataObject = { name: 'test' };
    const url = {
      query: 'FROM logs-* | STATS count=COUNT()',
    };

    const result = parser.parseUrl(dataObject, url);

    expect(result.url.dropNullColumns).toBe(true);
  });

  test('should preserve explicit dropNullColumns value', () => {
    const { parser } = createParser();
    const dataObject = { name: 'test' };
    const url = {
      query: 'FROM logs-* | STATS count=COUNT()',
      dropNullColumns: false,
    };

    const result = parser.parseUrl(dataObject, url);

    expect(result.url.dropNullColumns).toBe(false);
  });
});

describe('EsqlQueryParser.populateData', () => {
  test('should execute ES|QL query and populate data', async () => {
    const { parser, searchAPI } = createParser();

    const mockResponse = [
      {
        name: 'test_query',
        rawResponse: {
          columns: [
            { name: 'country', type: 'keyword' },
            { name: 'count', type: 'long' },
          ],
          values: [
            ['US', 100],
            ['UK', 50],
          ],
        },
      },
    ];

    searchAPI.searchEsql.mockReturnValue(of(mockResponse));

    const requests = [
      {
        url: { query: 'FROM logs-* | STATS count=COUNT() BY country' },
        dataObject: { name: 'test_query' },
      },
    ];

    await parser.populateData(requests);

    expect(searchAPI.searchEsql).toHaveBeenCalled();
    expect(requests[0].dataObject.values).toEqual([
      { country: 'US', count: 100 },
      { country: 'UK', count: 50 },
    ]);
  });

  test('should handle multiple requests', async () => {
    const { parser, searchAPI } = createParser();

    const mockResponse = [
      {
        name: 'query1',
        rawResponse: {
          columns: [{ name: 'total', type: 'long' }],
          values: [[100]],
        },
      },
      {
        name: 'query2',
        rawResponse: {
          columns: [{ name: 'total', type: 'long' }],
          values: [[200]],
        },
      },
    ];

    searchAPI.searchEsql.mockReturnValue(of(mockResponse));

    const requests = [
      {
        url: { query: 'FROM logs-* | STATS total=COUNT()' },
        dataObject: { name: 'query1' },
      },
      {
        url: { query: 'FROM metrics-* | STATS total=COUNT()' },
        dataObject: { name: 'query2' },
      },
    ];

    await parser.populateData(requests);

    expect(requests[0].dataObject.values).toEqual([{ total: 100 }]);
    expect(requests[1].dataObject.values).toEqual([{ total: 200 }]);
  });

  test('binds dashboard variables per ES|QL data source', async () => {
    const { parser, searchAPI } = createParser(rangeStart, rangeEnd, {}, [
      { key: 'fizzbuzz', value: 'ios', type: ESQLVariableType.VALUES },
      { key: 'color', value: 'blue', type: ESQLVariableType.VALUES },
    ]);

    searchAPI.searchEsql.mockReturnValue(of([]));

    await parser.populateData([
      {
        url: { query: 'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz' },
        dataObject: { name: 'os_query' },
      },
      {
        url: { query: 'FROM logs-* | WHERE color.keyword == ?color' },
        dataObject: { name: 'color_query' },
      },
    ]);

    const [first, second] = searchAPI.searchEsql.mock.calls[0][0];
    expect(first.params).toEqual([{ fizzbuzz: 'ios' }]);
    expect(second.params).toEqual([{ color: 'blue' }]);
  });

  test('binds an identifier variable and sends the query without mutating the source', async () => {
    const storedQuery = 'FROM logs-* | STATS COUNT(??field)';
    const { parser, searchAPI } = createParser(rangeStart, rangeEnd, {}, [
      { key: 'field', value: 'bytes', type: ESQLVariableType.FIELDS },
    ]);

    searchAPI.searchEsql.mockReturnValue(of([]));

    const url = { query: storedQuery };
    await parser.populateData([{ url, dataObject: { name: 'field_query' } }]);

    const [request] = searchAPI.searchEsql.mock.calls[0][0];
    expect(request.query).toBe(storedQuery);
    expect(request.params).toEqual([{ field: 'bytes' }]);
    expect(url.query).toBe(storedQuery);
  });

  test('binds time params when the query contains ?_tstart/?_tend without %timefield%', async () => {
    const { parser, searchAPI } = createParser(1000000, 2000000);
    const dataObject = { name: 'time_query' };
    const { url } = parser.parseUrl(dataObject, {
      '%type%': 'esql',
      query: 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend',
    });

    searchAPI.searchEsql.mockReturnValue(
      of([
        {
          name: 'time_query',
          rawResponse: {
            columns: [{ name: 'count', type: 'long' }],
            values: [[42]],
          },
        },
      ])
    );

    await parser.populateData([{ url, dataObject }]);

    const callArgs = searchAPI.searchEsql.mock.calls[0][0][0];
    expect(callArgs.params).toHaveLength(2);
    expect(callArgs.params[0]).toHaveProperty('_tstart');
    expect(callArgs.params[1]).toHaveProperty('_tend');
    expect(callArgs.params[0]._tstart).toBe(new Date(1000000).toISOString());
    expect(callArgs.params[1]._tend).toBe(new Date(2000000).toISOString());
  });

  test('should apply dashboard filters when %context% is true', async () => {
    const { parser, searchAPI } = createParser(rangeStart, rangeEnd, mockFilters);

    const mockResponse = [
      {
        name: 'filtered_query',
        rawResponse: {
          columns: [{ name: 'count', type: 'long' }],
          values: [[10]],
        },
      },
    ];

    searchAPI.searchEsql.mockReturnValue(of(mockResponse));

    const requests = [
      {
        url: {
          query: 'FROM logs-* | STATS count=COUNT()',
          filter: mockFilters,
        },
        dataObject: { name: 'filtered_query' },
      },
    ];

    await parser.populateData(requests);

    const callArgs = searchAPI.searchEsql.mock.calls[0][0][0];
    expect(callArgs.filter).toEqual(mockFilters);
  });

  test('applies both time params and a DSL time filter for BUCKET queries', async () => {
    getESQLTimeField.mockResolvedValue('timestamp');

    const { parser, searchAPI } = createParser(rangeStart, rangeEnd);
    const dataObject = { name: 'bucket_query' };
    const { url } = parser.parseUrl(dataObject, {
      '%type%': 'esql',
      query:
        'FROM kibana_sample_data_flights | STATS count = COUNT(*) BY Date = BUCKET(timestamp, 50, ?_tstart, ?_tend) | SORT Date ASC',
    });

    searchAPI.searchEsql.mockReturnValue(
      of([
        {
          name: 'bucket_query',
          rawResponse: {
            columns: [
              { name: 'Date', type: 'date' },
              { name: 'count', type: 'long' },
            ],
            values: [[new Date(rangeStart).toISOString(), 1]],
          },
        },
      ])
    );

    await parser.populateData([{ url, dataObject }]);

    const callArgs = searchAPI.searchEsql.mock.calls[0][0][0];
    expect(callArgs.params).toHaveLength(2);
    expect(callArgs.params[0]).toEqual({ _tstart: new Date(rangeStart).toISOString() });
    expect(callArgs.params[1]).toEqual({ _tend: new Date(rangeEnd).toISOString() });
    expect(callArgs.filter).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          filter: expect.arrayContaining([
            {
              range: {
                timestamp: {
                  gte: new Date(rangeStart).toISOString(),
                  lte: new Date(rangeEnd).toISOString(),
                  format: 'strict_date_optional_time',
                },
              },
            },
          ]),
        }),
      })
    );
  });

  test('applies a DSL time filter on the default time field when %timefield% is absent', async () => {
    getESQLTimeField.mockResolvedValue('timestamp');

    const { parser, searchAPI } = createParser(rangeStart, rangeEnd);
    const dataObject = { name: 'default_time_query' };
    const { url } = parser.parseUrl(dataObject, {
      '%type%': 'esql',
      query: 'FROM kibana_sample_data_flights | STATS count = COUNT(*) BY Dest',
    });

    searchAPI.searchEsql.mockReturnValue(
      of([
        {
          name: 'default_time_query',
          rawResponse: {
            columns: [{ name: 'count', type: 'long' }],
            values: [[1]],
          },
        },
      ])
    );

    await parser.populateData([{ url, dataObject }]);

    expect(getESQLTimeField).toHaveBeenCalled();
    const callArgs = searchAPI.searchEsql.mock.calls[0][0][0];
    expect(callArgs.filter).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          filter: expect.arrayContaining([
            {
              range: {
                timestamp: {
                  gte: new Date(rangeStart).toISOString(),
                  lte: new Date(rangeEnd).toISOString(),
                  format: 'strict_date_optional_time',
                },
              },
            },
          ]),
        }),
      })
    );
  });

  test('does not apply a time filter when no default time field exists', async () => {
    getESQLTimeField.mockResolvedValue(undefined);

    const { parser, searchAPI } = createParser(rangeStart, rangeEnd);
    const dataObject = { name: 'no_time_query' };
    const { url } = parser.parseUrl(dataObject, {
      '%type%': 'esql',
      query: 'FROM my-index-without-time | STATS count = COUNT(*)',
    });

    searchAPI.searchEsql.mockReturnValue(
      of([
        {
          name: 'no_time_query',
          rawResponse: {
            columns: [{ name: 'count', type: 'long' }],
            values: [[1]],
          },
        },
      ])
    );

    await parser.populateData([{ url, dataObject }]);

    const callArgs = searchAPI.searchEsql.mock.calls[0][0][0];
    expect(callArgs.filter).toBeUndefined();
  });

  test('merges dashboard context filters with the DSL time filter', async () => {
    const { parser, searchAPI } = createParser(rangeStart, rangeEnd, mockFilters);
    const dataObject = { name: 'context_time_query' };
    const { url } = parser.parseUrl(dataObject, {
      '%type%': 'esql',
      '%context%': true,
      '%timefield%': 'timestamp',
      query: 'FROM kibana_sample_data_flights | STATS count = COUNT(*)',
    });

    searchAPI.searchEsql.mockReturnValue(
      of([
        {
          name: 'context_time_query',
          rawResponse: {
            columns: [{ name: 'count', type: 'long' }],
            values: [[1]],
          },
        },
      ])
    );

    await parser.populateData([{ url, dataObject }]);

    const callArgs = searchAPI.searchEsql.mock.calls[0][0][0];
    expect(callArgs.filter).toEqual({
      bool: {
        must: [
          mockFilters,
          expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                {
                  range: {
                    timestamp: {
                      gte: new Date(rangeStart).toISOString(),
                      lte: new Date(rangeEnd).toISOString(),
                      format: 'strict_date_optional_time',
                    },
                  },
                },
              ]),
            }),
          }),
        ],
        filter: [],
        should: [],
        must_not: [],
      },
    });
  });

  test('applies a DSL time filter on the explicit %timefield% without time params in the query', async () => {
    const { parser, searchAPI } = createParser(rangeStart, rangeEnd);
    const dataObject = { name: 'metric_query' };
    const { url } = parser.parseUrl(dataObject, {
      '%type%': 'esql',
      '%timefield%': 'timestamp',
      query: 'FROM kibana_sample_data_flights | STATS total = SUM(AvgTicketPrice)',
    });

    searchAPI.searchEsql.mockReturnValue(
      of([
        {
          name: 'metric_query',
          rawResponse: {
            columns: [{ name: 'total', type: 'double' }],
            values: [[100]],
          },
        },
      ])
    );

    await parser.populateData([{ url, dataObject }]);

    const callArgs = searchAPI.searchEsql.mock.calls[0][0][0];
    expect(callArgs.filter).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          filter: expect.arrayContaining([
            {
              range: {
                timestamp: {
                  gte: new Date(rangeStart).toISOString(),
                  lte: new Date(rangeEnd).toISOString(),
                  format: 'strict_date_optional_time',
                },
              },
            },
          ]),
        }),
      })
    );
  });

  test('should handle empty results', async () => {
    const { parser, searchAPI } = createParser();

    const mockResponse = [
      {
        name: 'empty_query',
        rawResponse: {
          columns: [{ name: 'count', type: 'long' }],
          values: [],
        },
      },
    ];

    searchAPI.searchEsql.mockReturnValue(of(mockResponse));

    const requests = [
      {
        url: { query: 'FROM logs-* | STATS count=COUNT() | WHERE count > 999999' },
        dataObject: { name: 'empty_query' },
      },
    ];

    await parser.populateData(requests);

    expect(requests[0].dataObject.values).toEqual([]);
  });

  test('should pass dropNullColumns parameter', async () => {
    const { parser, searchAPI } = createParser();

    const mockResponse = [
      {
        name: 'test',
        rawResponse: {
          columns: [{ name: 'count', type: 'long' }],
          values: [[1]],
        },
      },
    ];

    searchAPI.searchEsql.mockReturnValue(of(mockResponse));

    const requests = [
      {
        url: { query: 'FROM logs-*', dropNullColumns: false },
        dataObject: { name: 'test' },
      },
    ];

    await parser.populateData(requests);

    const callArgs = searchAPI.searchEsql.mock.calls[0][0][0];
    expect(callArgs.dropNullColumns).toBe(false);
  });
});

describe('EsqlQueryParser._injectNamedParams', () => {
  test('should inject time parameters for ?_tstart', () => {
    const { parser } = createParser(1000000, 2000000);

    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart';
    const url = { query };

    const result = parser._injectNamedParams(query, url);

    expect(result.query).toBe(query);
    expect(result.params).toHaveLength(1);
    expect(result.params[0]).toHaveProperty('_tstart');
    expect(result.params[0]._tstart).toBe(new Date(1000000).toISOString());
  });

  test('should inject time parameters for ?_tend', () => {
    const { parser } = createParser(1000000, 2000000);

    const query = 'FROM logs-* | WHERE @timestamp <= ?_tend';
    const url = { query };

    const result = parser._injectNamedParams(query, url);

    expect(result.query).toBe(query);
    expect(result.params).toHaveLength(1);
    expect(result.params[0]).toHaveProperty('_tend');
    expect(result.params[0]._tend).toBe(new Date(2000000).toISOString());
  });

  test('should inject both time parameters', () => {
    const { parser } = createParser(1000000, 2000000);

    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';
    const url = { query };

    const result = parser._injectNamedParams(query, url);

    expect(result.params).toHaveLength(2);
    expect(result.params[0]._tstart).toBe(new Date(1000000).toISOString());
    expect(result.params[1]._tend).toBe(new Date(2000000).toISOString());
  });

  test('should return empty params when no time parameters in query', () => {
    const { parser } = createParser(1000000, 2000000);

    const query = 'FROM logs-* | STATS count=COUNT()';
    const url = { query };

    const result = parser._injectNamedParams(query, url);

    expect(result.params).toHaveLength(0);
  });

  test('does not warn when %timefield% is set but query has no time params', () => {
    const { parser } = createParser(1000000, 2000000);
    const dataObject = { name: 'metric' };
    const { url } = parser.parseUrl(dataObject, {
      '%type%': 'esql',
      '%timefield%': '@timestamp',
      query: 'FROM logs-* | STATS count=COUNT()',
    });

    parser._injectNamedParams(url.query, url);

    expect(parser.$$$warnCount).toBe(0);
  });

  test('should include custom params from url', () => {
    const { parser } = createParser();

    const query = 'FROM logs-* | WHERE level = ?level';
    const url = {
      query,
      params: [{ level: 'ERROR' }],
    };

    const result = parser._injectNamedParams(query, url);

    expect(result.params).toHaveLength(1);
    expect(result.params[0]).toEqual({ level: 'ERROR' });
  });

  test('should combine time params and custom params', () => {
    const { parser } = createParser(1000000, 2000000);

    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart AND level = ?level';
    const url = {
      query,
      params: [{ level: 'ERROR' }],
    };

    const result = parser._injectNamedParams(query, url);

    expect(result.params).toHaveLength(2);
    expect(result.params[0]).toHaveProperty('_tstart');
    expect(result.params[1]).toEqual({ level: 'ERROR' });
  });

  test('should handle case-insensitive time parameter detection', () => {
    const { parser } = createParser(1000000, 2000000);

    const query = 'FROM logs-* | WHERE @timestamp >= ?_TSTART AND @timestamp <= ?_TEND';
    const url = { query };

    const result = parser._injectNamedParams(query, url);

    expect(result.params).toHaveLength(2);
    expect(result.params[0]).toHaveProperty('_tstart');
    expect(result.params[1]).toHaveProperty('_tend');
  });

  test('binds an example user-named values variable by key', () => {
    const { parser } = createParser(rangeStart, rangeEnd, {}, [
      { key: 'fizzbuzz', value: 'ios', type: ESQLVariableType.VALUES },
    ]);

    const query = 'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz';
    const result = parser._injectNamedParams(query, { query });

    expect(result.query).toBe(query);
    expect(result.params).toEqual([{ fizzbuzz: 'ios' }]);
  });

  test('omits unused dashboard variables from the request params', () => {
    const { parser } = createParser(rangeStart, rangeEnd, {}, [
      { key: 'fizzbuzz', value: 'ios', type: ESQLVariableType.VALUES },
      { key: 'color', value: 'blue', type: ESQLVariableType.VALUES },
    ]);

    const query = 'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz';
    const result = parser._injectNamedParams(query, { query });

    expect(result.params).toEqual([{ fizzbuzz: 'ios' }]);
  });

  test('binds an identifier variable written with the ?? prefix', () => {
    const { parser } = createParser(rangeStart, rangeEnd, {}, [
      { key: 'field', value: 'host.name', type: ESQLVariableType.FIELDS },
    ]);

    const query = 'FROM logs-* | STATS COUNT(??field)';
    const result = parser._injectNamedParams(query, { query });

    expect(result.query).toBe(query);
    expect(result.params).toEqual([{ field: 'host.name' }]);
  });

  test('dashboard control values win collisions with static spec params', () => {
    const { parser } = createParser(rangeStart, rangeEnd, {}, [
      { key: 'fizzbuzz', value: 'ios', type: ESQLVariableType.VALUES },
    ]);

    const query = 'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz';
    const result = parser._injectNamedParams(query, {
      query,
      params: [{ fizzbuzz: 'hardcoded' }],
    });

    expect(result.params).toEqual([{ fizzbuzz: 'ios' }]);
  });

  test('keeps static spec params whose keys are not bound by dashboard controls', () => {
    const { parser } = createParser();

    const query = 'FROM logs-* | WHERE level == ?level';
    const result = parser._injectNamedParams(query, {
      query,
      params: [{ level: 'ERROR' }],
    });

    expect(result.params).toEqual([{ level: 'ERROR' }]);
  });

  test('still binds time params together with a user-named variable', () => {
    const { parser } = createParser(1000000, 2000000, {}, [
      { key: 'fizzbuzz', value: 'ios', type: ESQLVariableType.VALUES },
    ]);

    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart AND machine.os.keyword == ?fizzbuzz';
    const result = parser._injectNamedParams(query, { query });

    expect(result.params).toHaveLength(2);
    expect(result.params[0]).toEqual({ _tstart: new Date(1000000).toISOString() });
    expect(result.params[1]).toEqual({ fizzbuzz: 'ios' });
  });

  test('dashboard time range wins when spec params try to override _tstart and _tend', () => {
    const dashboardStart = '2024-01-01T00:00:00.000Z';
    const dashboardEnd = '2024-12-31T23:59:59.999Z';
    const { parser } = createParser(Date.parse(dashboardStart), Date.parse(dashboardEnd));

    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';
    const result = parser._injectNamedParams(query, {
      query,
      params: [{ _tstart: '2020-01-01T00:00:00.000Z' }, { _tend: '2020-06-30T23:59:59.999Z' }],
    });

    expect(result.params).toEqual([{ _tstart: dashboardStart }, { _tend: dashboardEnd }]);
  });
});

describe('EsqlQueryParser._transformEsqlRowsToVegaRows', () => {
  test('should transform columnar data to row objects', () => {
    const { parser } = createParser();

    const response = {
      columns: [
        { name: 'country', type: 'keyword' },
        { name: 'count', type: 'long' },
      ],
      values: [
        ['US', 100],
        ['UK', 50],
        ['DE', 75],
      ],
    };

    const result = parser._transformEsqlRowsToVegaRows(response);

    expect(result).toEqual([
      { country: 'US', count: 100 },
      { country: 'UK', count: 50 },
      { country: 'DE', count: 75 },
    ]);
  });

  test('should handle empty values array', () => {
    const { parser } = createParser();

    const response = {
      columns: [{ name: 'count', type: 'long' }],
      values: [],
    };

    const result = parser._transformEsqlRowsToVegaRows(response);

    expect(result).toEqual([]);
  });

  test('should preserve null values', () => {
    const { parser } = createParser();

    const response = {
      columns: [
        { name: 'country', type: 'keyword' },
        { name: 'count', type: 'long' },
      ],
      values: [
        ['US', 100],
        [null, 50],
        ['DE', null],
      ],
    };

    const result = parser._transformEsqlRowsToVegaRows(response);

    expect(result).toEqual([
      { country: 'US', count: 100 },
      { country: null, count: 50 },
      { country: 'DE', count: null },
    ]);
  });

  test('should handle single column', () => {
    const { parser } = createParser();

    const response = {
      columns: [{ name: 'total', type: 'long' }],
      values: [[42]],
    };

    const result = parser._transformEsqlRowsToVegaRows(response);

    expect(result).toEqual([{ total: 42 }]);
  });

  test('should handle many columns', () => {
    const { parser } = createParser();

    const response = {
      columns: [
        { name: 'a', type: 'keyword' },
        { name: 'b', type: 'long' },
        { name: 'c', type: 'double' },
        { name: 'd', type: 'boolean' },
        { name: 'e', type: 'keyword' },
      ],
      values: [['val1', 1, 1.5, true, 'val2']],
    };

    const result = parser._transformEsqlRowsToVegaRows(response);

    expect(result).toEqual([{ a: 'val1', b: 1, c: 1.5, d: true, e: 'val2' }]);
  });

  test('should handle transformation errors gracefully', () => {
    const { parser } = createParser();

    // Invalid response - missing columns
    const response = {
      values: [['US', 100]],
    };

    const result = parser._transformEsqlRowsToVegaRows(response);

    expect(result).toEqual([]);
    expect(parser.$$$warnCount).toBe(1);
  });

  test('should handle multi-value fields (arrays)', () => {
    const { parser } = createParser();

    const response = {
      columns: [
        { name: 'tags', type: 'keyword' },
        { name: 'count', type: 'long' },
      ],
      values: [
        [['tag1', 'tag2'], 100],
        [['tag3'], 50],
      ],
    };

    const result = parser._transformEsqlRowsToVegaRows(response);

    expect(result).toEqual([
      { tags: ['tag1', 'tag2'], count: 100 },
      { tags: ['tag3'], count: 50 },
    ]);
  });

  test('should handle complex nested objects', () => {
    const { parser } = createParser();

    const response = {
      columns: [
        { name: 'location', type: 'geo_point' },
        { name: 'count', type: 'long' },
      ],
      values: [
        [{ lat: 40.7128, lon: -74.006 }, 100],
        [{ lat: 51.5074, lon: -0.1278 }, 50],
      ],
    };

    const result = parser._transformEsqlRowsToVegaRows(response);

    expect(result).toEqual([
      { location: { lat: 40.7128, lon: -74.006 }, count: 100 },
      { location: { lat: 51.5074, lon: -0.1278 }, count: 50 },
    ]);
  });
});
