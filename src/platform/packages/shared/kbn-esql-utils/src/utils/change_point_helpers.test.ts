/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  hasChangePointCommand,
  getChangePointOutputColumnNames,
  getChangePointSeriesColumns,
  buildChangePointLineDataQuery,
  appendEntityFiltersToChangePointLineEsql,
  formatEsqlIdentifier,
  formatEsqlLiteral,
} from './change_point_helpers';

describe('hasChangePointCommand', () => {
  it('should return false for undefined or empty esql', () => {
    expect(hasChangePointCommand(undefined)).toBe(false);
    expect(hasChangePointCommand('')).toBe(false);
  });

  it('should return false when query has no CHANGE_POINT command', () => {
    expect(hasChangePointCommand('FROM index | STATS count = COUNT(*)')).toBe(false);
    expect(hasChangePointCommand('FROM index | WHERE field > 0')).toBe(false);
  });

  it('should return true when query contains CHANGE_POINT command', () => {
    expect(hasChangePointCommand('FROM a | CHANGE_POINT value')).toBe(true);
    expect(hasChangePointCommand('FROM a | CHANGE_POINT value ON key')).toBe(true);
    expect(
      hasChangePointCommand(
        'FROM a | STATS count = COUNT(*) BY bucket | CHANGE_POINT count ON bucket'
      )
    ).toBe(true);
  });

  it('should return false when CHANGE_POINT only appears inside FORK branches', () => {
    // FORK sub-queries are not top-level pipeline commands; the change-point data source
    // profile must not activate for FORK-only queries.
    const forkQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://domainsigma.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | SORT bucket | CHANGE_POINT avg_bytes ON bucket )
  ( WHERE referer == "https://www.google.com/" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | SORT bucket | CHANGE_POINT avg_bytes ON bucket )
| WHERE type IS NOT NULL
| KEEP provider, bucket, avg_bytes, type, pvalue`;
    expect(hasChangePointCommand(forkQuery)).toBe(false);
  });

  it('should return true when CHANGE_POINT is a top-level command after FORK', () => {
    const mixedQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://domainsigma.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | SORT bucket )
| CHANGE_POINT avg_bytes ON bucket`;
    expect(hasChangePointCommand(mixedQuery)).toBe(true);
  });
});

describe('getChangePointOutputColumnNames', () => {
  it('should return undefined for undefined or when no CHANGE_POINT command', () => {
    expect(getChangePointOutputColumnNames(undefined)).toBeUndefined();
    expect(getChangePointOutputColumnNames('FROM index')).toBeUndefined();
  });

  it('should return default type and pvalue column names when AS is not used', () => {
    const result = getChangePointOutputColumnNames('FROM a | CHANGE_POINT value');
    expect(result).toEqual({ typeColumn: 'type', pvalueColumn: 'pvalue' });
  });

  it('should return custom column names when AS type_name, pvalue_name is used', () => {
    const result = getChangePointOutputColumnNames(
      'FROM a | CHANGE_POINT value AS change_type, p_value'
    );
    expect(result?.typeColumn).toBe('change_type');
    expect(result?.pvalueColumn).toBe('p_value');
  });
});

describe('getChangePointSeriesColumns', () => {
  it('returns value and time columns for a simple pipeline', () => {
    expect(
      getChangePointSeriesColumns('FROM a | STATS c = COUNT(*) BY b | CHANGE_POINT c ON b AS t, pv')
    ).toEqual({ valueColumn: 'c', timeColumn: 'b' });
  });

  it('defaults time column to @timestamp when ON is omitted', () => {
    expect(getChangePointSeriesColumns('FROM a | CHANGE_POINT value')).toEqual({
      valueColumn: 'value',
      timeColumn: '@timestamp',
    });
  });

  it('reads first CHANGE_POINT inside FORK', () => {
    const forkQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://a.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket )
| WHERE type IS NOT NULL`;
    expect(getChangePointSeriesColumns(forkQuery)).toEqual({
      valueColumn: 'avg_bytes',
      timeColumn: 'bucket',
    });
  });
});

describe('buildChangePointLineDataQuery', () => {
  it('returns pipeline before top-level CHANGE_POINT', () => {
    const q =
      'FROM gallery-* | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket';
    expect(buildChangePointLineDataQuery(q)).toBe(
      'FROM gallery-* | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day)'
    );
  });

  it('strips trailing SORT before CHANGE_POINT', () => {
    const q = 'FROM i | STATS m = AVG(x) BY t | SORT t | CHANGE_POINT m ON t';
    expect(buildChangePointLineDataQuery(q)).toBe('FROM i | STATS m = AVG(x) BY t');
  });

  it('uses FORK branch 0 by default', () => {
    const forkQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://a.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | SORT bucket | CHANGE_POINT avg_bytes ON bucket )
  ( WHERE referer == "http://b.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket )
| WHERE type IS NOT NULL`;
    const line = buildChangePointLineDataQuery(forkQuery);
    expect(line).toContain('FROM gallery-*');
    expect(line).toContain('WHERE referer == "http://a.com"');
    expect(line).not.toContain('CHANGE_POINT');
    expect(line).not.toContain('SORT bucket');
  });

  it('excludes commands after FORK (e.g. filter on change-point output)', () => {
    const forkQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://a.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket )
| WHERE type IS NOT NULL`;
    const line = buildChangePointLineDataQuery(forkQuery);
    expect(line).toContain('FROM gallery-*');
    expect(line).not.toContain('type IS NOT NULL');
    expect(line).not.toContain('CHANGE_POINT');
  });

  it('preserves commands between source and FORK', () => {
    const forkQuery = `FROM gallery-*
| EVAL prep = 1
| FORK
  ( WHERE referer == "http://a.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket )
  ( WHERE referer == "http://b.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket )`;
    const line0 = buildChangePointLineDataQuery(forkQuery, { forkBranchIndex: 0 });
    const line1 = buildChangePointLineDataQuery(forkQuery, { forkBranchIndex: 1 });
    expect(line0).toContain('EVAL prep = 1');
    expect(line0).toContain('http://a.com');
    expect(line1).toContain('EVAL prep = 1');
    expect(line1).toContain('http://b.com');
  });
});

describe('appendEntityFiltersToChangePointLineEsql', () => {
  describe('formatEsqlIdentifier', () => {
    it('leaves simple identifiers unquoted', () => {
      expect(formatEsqlIdentifier('host')).toBe('host');
    });

    it('backticks identifiers with dots', () => {
      expect(formatEsqlIdentifier('k8s.pod.name')).toBe('`k8s.pod.name`');
    });

    it('escapes backticks in identifiers', () => {
      expect(formatEsqlIdentifier('weird`id')).toBe('`weird``id`');
    });
  });

  describe('formatEsqlLiteral', () => {
    it('formats empty string as an empty ES|QL string literal', () => {
      expect(formatEsqlLiteral('')).toBe('""');
    });

    it('quotes strings', () => {
      expect(formatEsqlLiteral('a"b')).toBe('"a\\"b"');
    });

    it('formats finite numbers', () => {
      expect(formatEsqlLiteral(3.5)).toBe('3.5');
    });

    it('formats booleans', () => {
      expect(formatEsqlLiteral(false)).toBe('false');
    });

    it('formats Date as ISO string literal', () => {
      const d = new Date('2023-11-14T22:13:20.000Z');
      expect(formatEsqlLiteral(d)).toBe('"2023-11-14T22:13:20.000Z"');
    });
  });

  describe('appendEntityFiltersToChangePointLineEsql behavior', () => {
    it('returns the query unchanged when there are no entity columns', () => {
      const q = 'FROM idx | STATS m = AVG(x) BY t';
      expect(appendEntityFiltersToChangePointLineEsql(q, { host: 'a' }, [])).toBe(q);
    });

    it('appends WHERE for entity columns', () => {
      const q = 'FROM idx | STATS m = AVG(x) BY host, t';
      expect(appendEntityFiltersToChangePointLineEsql(q, { host: 'pod-a' }, ['host'])).toBe(
        'FROM idx | STATS m = AVG(x) BY host, t | WHERE host == "pod-a"'
      );
    });

    it('combines multiple predicates with AND', () => {
      const q = 'FROM idx | STATS m = AVG(x) BY a, b, t';
      expect(appendEntityFiltersToChangePointLineEsql(q, { a: 1, b: 'x' }, ['a', 'b'])).toBe(
        'FROM idx | STATS m = AVG(x) BY a, b, t | WHERE a == 1 AND b == "x"'
      );
    });

    it('skips columns with no literal (null / undefined)', () => {
      const q = 'FROM idx | STATS m = AVG(x) BY host, t';
      expect(
        appendEntityFiltersToChangePointLineEsql(q, { host: null, other: 'ok' }, ['host', 'other'])
      ).toBe('FROM idx | STATS m = AVG(x) BY host, t | WHERE other == "ok"');
    });

    it('appends WHERE for entity columns with empty string values', () => {
      // Regression: formatEsqlLiteral("") previously returned undefined, silently dropping the
      // filter. Empty strings are valid ES|QL literals and must produce host == "".
      const q = 'FROM idx | STATS m = AVG(x) BY host, t';
      expect(
        appendEntityFiltersToChangePointLineEsql(q, { host: '', other: 'ok' }, ['host', 'other'])
      ).toBe('FROM idx | STATS m = AVG(x) BY host, t | WHERE host == "" AND other == "ok"');
    });

    it('does not duplicate WHERE when pipeline already constrains the entity via WHERE', () => {
      const line =
        'FROM gallery-* | WHERE clientip == "5.255.253.75" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day)';
      expect(
        appendEntityFiltersToChangePointLineEsql(line, { clientip: '5.255.253.75' }, ['clientip'])
      ).toBe(line);
    });

    it('does not duplicate WHERE when EVAL already sets the entity column to the same literal', () => {
      const line =
        'FROM gallery-* | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | EVAL clientip = "5.255.253.75"';
      expect(
        appendEntityFiltersToChangePointLineEsql(line, { clientip: '5.255.253.75' }, ['clientip'])
      ).toBe(line);
    });

    it('still appends filters for entity columns not already constrained in the pipeline', () => {
      const line =
        'FROM gallery-* | WHERE clientip == "5.255.253.75" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day)';
      expect(
        appendEntityFiltersToChangePointLineEsql(line, { clientip: '5.255.253.75', region: 'us' }, [
          'clientip',
          'region',
        ])
      ).toBe(`${line} | WHERE region == "us"`);
    });
  });
});
