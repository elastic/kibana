/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findEsqlStepRegionsFromText } from './find_esql_step_regions';

describe('findEsqlStepRegionsFromText', () => {
  it('returns one region per elasticsearch.esql.query step', () => {
    const text = `steps:
  - type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-* | LIMIT 10
  - type: elasticsearch.search
    with:
      index: other
  - type: elasticsearch.esql.query
    with:
      query: "FROM events | KEEP id"
`;
    const regions = findEsqlStepRegionsFromText(text);
    expect(regions).toHaveLength(2);
    expect(regions[0].scalarStyle).toBe('BLOCK_LITERAL');
    expect(regions[0].esql.includes('FROM logs-* | LIMIT 10')).toBe(true);
    expect(regions[1].scalarStyle).toBe('QUOTE_DOUBLE');
    expect(regions[1].esql).toBe('FROM events | KEEP id');
  });

  it('finds nested ES|QL steps inside loops', () => {
    const text = `steps:
  - type: foreach
    foreach: '[1,2,3]'
    steps:
      - type: elasticsearch.esql.query
        with:
          query: |
            FROM logs-*
`;
    const regions = findEsqlStepRegionsFromText(text);
    expect(regions).toHaveLength(1);
    expect(regions[0].esql.includes('FROM logs-*')).toBe(true);
  });

  it('skips steps with no query value yet', () => {
    const text = `steps:
  - type: elasticsearch.esql.query
    with:
      query:
`;
    expect(findEsqlStepRegionsFromText(text)).toHaveLength(0);
  });

  it('returns [] for unrelated step types', () => {
    const text = `steps:
  - type: elasticsearch.search
    with:
      query:
        match_all: {}
`;
    expect(findEsqlStepRegionsFromText(text)).toHaveLength(0);
  });

  it('returns [] on completely malformed input', () => {
    expect(findEsqlStepRegionsFromText('::: not yaml :::')).toEqual([]);
  });
});
