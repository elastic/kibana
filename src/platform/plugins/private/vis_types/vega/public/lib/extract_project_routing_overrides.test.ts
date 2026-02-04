/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractProjectRoutingOverrides } from './extract_project_routing_overrides';

describe('extractProjectRoutingOverrides', () => {
  it('should extract project routing from ES|QL query with SET instruction', () => {
    const spec = {
      data: {
        name: 'metric',
        url: {
          '%type%': 'esql',
          query: 'SET project_routing = "_alias:_origin"; FROM logs-* | STATS count=COUNT()',
        },
      },
    };

    const result = extractProjectRoutingOverrides(spec);

    expect(result).toEqual([{ name: 'metric', value: '_alias:_origin' }]);
  });
  it('should extract project routing from ES|QL query with multiple sources', () => {
    const spec = {
      data: [
        {
          name: 'metric',
          url: {
            '%type%': 'esql',
            query:
              'SET project_routing = "_alias:_origin"; FROM kibana_sample_data_logs | STATS total=COUNT()',
          },
        },
        {
          name: 'metric2',
          url: {
            '%type%': 'esql',
            query:
              'SET project_routing = "_alias:*"; FROM kibana_sample_data_logs | STATS total=COUNT()',
          },
        },
      ],
    };

    const result = extractProjectRoutingOverrides(spec);

    expect(result).toEqual([
      { name: 'metric', value: '_alias:_origin' },
      { name: 'metric2', value: '_alias:*' },
    ]);
  });

  it('should return undefined when no ES|QL queries with project routing', () => {
    const spec = {
      data: [
        {
          name: 'regular',
          url: {
            '%type%': 'elasticsearch',
            index: 'logs-*',
          },
        },
      ],
    };

    const result = extractProjectRoutingOverrides(spec);

    expect(result).toBeUndefined();
  });
});
