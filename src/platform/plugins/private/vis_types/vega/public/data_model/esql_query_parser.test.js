/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { EsqlQueryParser } from './esql_query_parser';

const rangeStart = 1000000;
const rangeEnd = 2000000;

const mockFilters = {
  bool: {
    must: [{ match_all: {} }],
    filter: [{ range: { '@timestamp': { gte: '2024-01-01', lte: '2024-12-31' } } }],
  },
};

function createParser(min = rangeStart, max = rangeEnd, dashboardCtx = {}) {
  const timeCache = {
    getTimeBounds: () => ({ min, max }),
  };

  const searchAPI = {
    searchEsql: jest.fn(() => of([])),
  };

  const onWarning = jest.fn();

  const parser = new EsqlQueryParser(timeCache, searchAPI, dashboardCtx, onWarning);
  parser.$$$warnCount = 0;
  parser._onWarning = (...args) => {
    parser.$$$warnCount++;
    onWarning(...args);
  };

  return { parser, searchAPI, onWarning };
}

jest.mock('../services');

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

    expect(result.url._useTimeParams).toBe(true);
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

  test('should inject time parameters when %timefield% is set', async () => {
    const { parser, searchAPI } = createParser(1000000, 2000000);

    const mockResponse = [
      {
        name: 'time_query',
        rawResponse: {
          columns: [{ name: 'count', type: 'long' }],
          values: [[42]],
        },
      },
    ];

    searchAPI.searchEsql.mockReturnValue(of(mockResponse));

    const requests = [
      {
        url: {
          query: 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend',
          _useTimeParams: true,
        },
        dataObject: { name: 'time_query' },
      },
    ];

    await parser.populateData(requests);

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
    const url = { query, _useTimeParams: true };

    const result = parser._injectNamedParams(query, url);

    expect(result.query).toBe(query);
    expect(result.params).toHaveLength(1);
    expect(result.params[0]).toHaveProperty('_tstart');
    expect(result.params[0]._tstart).toBe(new Date(1000000).toISOString());
  });

  test('should inject time parameters for ?_tend', () => {
    const { parser } = createParser(1000000, 2000000);

    const query = 'FROM logs-* | WHERE @timestamp <= ?_tend';
    const url = { query, _useTimeParams: true };

    const result = parser._injectNamedParams(query, url);

    expect(result.query).toBe(query);
    expect(result.params).toHaveLength(1);
    expect(result.params[0]).toHaveProperty('_tend');
    expect(result.params[0]._tend).toBe(new Date(2000000).toISOString());
  });

  test('should inject both time parameters', () => {
    const { parser } = createParser(1000000, 2000000);

    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';
    const url = { query, _useTimeParams: true };

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

  test('should warn when %timefield% set but no time params in query', () => {
    const { parser } = createParser(1000000, 2000000);

    const query = 'FROM logs-* | STATS count=COUNT()';
    const url = { query, _useTimeParams: true };

    parser._injectNamedParams(query, url);

    expect(parser.$$$warnCount).toBe(1);
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
      _useTimeParams: true,
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
    const url = { query, _useTimeParams: true };

    const result = parser._injectNamedParams(query, url);

    expect(result.params).toHaveLength(2);
    expect(result.params[0]).toHaveProperty('_tstart');
    expect(result.params[1]).toHaveProperty('_tend');
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
