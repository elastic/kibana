/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { specUsesEsql } from './spec_uses_esql';

describe('specUsesEsql', () => {
  it('should return true when data is a single ES|QL data object', () => {
    const spec = {
      data: {
        name: 'metric',
        url: {
          '%type%': 'esql',
          query: 'FROM logs-* | STATS count=COUNT()',
        },
      },
    };

    expect(specUsesEsql(spec)).toBe(true);
  });

  it('should return true when at least one data object in an array is ES|QL', () => {
    const spec = {
      data: [
        {
          name: 'regular',
          url: {
            '%type%': 'elasticsearch',
            index: 'logs-*',
          },
        },
        {
          name: 'metric',
          url: {
            '%type%': 'esql',
            query: 'FROM logs-* | STATS count=COUNT()',
          },
        },
      ],
    };

    expect(specUsesEsql(spec)).toBe(true);
  });

  it('should return false when no data object uses ES|QL', () => {
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

    expect(specUsesEsql(spec)).toBe(false);
  });

  it('should return false when the spec has no data', () => {
    expect(specUsesEsql({})).toBe(false);
  });

  it('should return false when data.url is a string, not an ES|QL object', () => {
    const spec = {
      data: {
        url: 'https://example.com/data.json',
      },
    };

    expect(specUsesEsql(spec)).toBe(false);
  });
});
