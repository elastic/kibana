/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import {
  collectEsqlRegionsFromLookup,
  findEsqlRegionContainingCursor,
  findEsqlStepRegions,
} from './extract_esql_region';
import { buildWorkflowLookup } from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

function regionsFromText(text: string) {
  const lineCounter = new LineCounter();
  const document = parseDocument(text, { lineCounter, keepSourceTokens: true });
  const workflowLookup = buildWorkflowLookup(document, lineCounter);
  return collectEsqlRegionsFromLookup(workflowLookup, text);
}

describe('collectEsqlRegionsFromLookup', () => {
  it('returns one region per elasticsearch.esql.query step', () => {
    const text = `steps:
  - name: esql_a
    type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-* | LIMIT 10
  - type: elasticsearch.search
    with:
      index: other
  - name: esql_b
    type: elasticsearch.esql.query
    with:
      query: "FROM events | KEEP id"
`;
    const regions = regionsFromText(text);
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
      - name: nested_esql
        type: elasticsearch.esql.query
        with:
          query: |
            FROM logs-*
`;
    const regions = regionsFromText(text);
    expect(regions).toHaveLength(1);
    expect(regions[0].esql.includes('FROM logs-*')).toBe(true);
  });

  it('skips steps with no query value yet', () => {
    const text = `steps:
  - name: esql_step
    type: elasticsearch.esql.query
    with:
      query:
`;
    expect(regionsFromText(text)).toHaveLength(0);
  });

  it('returns [] for unrelated step types', () => {
    const text = `steps:
  - type: elasticsearch.search
    with:
      query:
        match_all: {}
`;
    expect(regionsFromText(text)).toHaveLength(0);
  });

  it('does not treat a comment substring as an ES|QL step', () => {
    const text = `steps:
  - name: log_step
    type: console
    with:
      message: "elasticsearch.esql.query is documented here"
`;
    expect(regionsFromText(text)).toHaveLength(0);
  });
});

describe('findEsqlStepRegions', () => {
  it('returns the same regions as collectEsqlRegionsFromLookup for the same workflow text', () => {
    const text = `steps:
  - name: esql_a
    type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-* | LIMIT 10
  - name: esql_b
    type: elasticsearch.esql.query
    with:
      query: "FROM events | KEEP id"
`;
    const fromLookup = regionsFromText(text);
    const fromFind = findEsqlStepRegions(text);

    expect(fromFind).toHaveLength(fromLookup.length);
    for (let i = 0; i < fromLookup.length; i++) {
      expect(fromFind[i]).toEqual(fromLookup[i]);
    }
  });
});

describe('findEsqlRegionContainingCursor', () => {
  it('resolves the region when the cursor sits in trailing whitespace after the trimmed body', () => {
    const text = `steps:
  - type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-*   `;
    const cursor = text.length;
    const region = findEsqlRegionContainingCursor(text, cursor);
    expect(region).not.toBeNull();
    expect(region!.esql).toBe('        FROM logs-*');
    expect(cursor).toBeGreaterThan(region!.contentEndInFile);
  });

  it('uses a provided path hint to avoid re-resolving the path', () => {
    const text = `steps:
  - id: a
    type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-*`;
    const cursor = text.indexOf('logs-*') + 'logs-*'.length;

    // Hint points at the `with.query` scalar; tryEsqlRegionFromPath should succeed.
    const hint = ['steps', 0, 'with', 'query'];
    const region = findEsqlRegionContainingCursor(text, cursor, hint);
    expect(region).not.toBeNull();
    expect(region!.esql.includes('FROM logs-*')).toBe(true);
  });

  it('falls back safely when the path hint is stale', () => {
    const text = `steps:
  - id: a
    type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-*`;
    const cursor = text.indexOf('FROM logs-*') + 'FROM'.length;

    // Stale hint points at a non-existent step index; must not throw and should still find the region.
    const staleHint = ['steps', 99, 'with', 'query'];
    const region = findEsqlRegionContainingCursor(text, cursor, staleHint);
    expect(region).not.toBeNull();
  });

  it('returns null when the cursor is outside the query scalar', () => {
    const text = `steps:
  - type: elasticsearch.esql.query
    with:
      query: |
        FROM logs
    name: "after"`;
    const nameOffset = text.indexOf('after');
    expect(findEsqlRegionContainingCursor(text, nameOffset)).toBeNull();
  });
});
