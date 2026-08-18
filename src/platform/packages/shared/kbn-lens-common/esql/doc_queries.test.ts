/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isTextBasedDoc,
  getTextBasedLayerQueries,
  getDocQuery,
  getChartScopedFilterQuery,
  type LensDocLike,
} from './doc_queries';

const kqlQuery = { query: 'bytes > 100', language: 'kuery' };
const esqlQuery = { esql: 'FROM index | LIMIT 10' };
const esqlQuery2 = { esql: 'FROM index2 | LIMIT 5' };

const textBasedDoc: LensDocLike = {
  state: {
    datasourceStates: {
      textBased: { layers: { layer1: { query: esqlQuery }, layer2: { query: esqlQuery2 } } },
    },
  },
};

const formBasedDoc: LensDocLike = {
  state: {
    query: kqlQuery,
    datasourceStates: { formBased: { layers: { layer1: {} } } },
  },
};

// legacy dual-written doc: stale aggregate copy in the slot
const legacyDualWrittenDoc: LensDocLike = {
  state: {
    query: { esql: 'FROM index | LIMIT 999' }, // diverged, stale
    datasourceStates: { textBased: { layers: { layer1: { query: esqlQuery } } } },
  },
};

// legacy doc that only carries the aggregate slot copy (no layer query)
const legacySlotOnlyDoc: LensDocLike = {
  state: {
    query: esqlQuery,
    datasourceStates: { textBased: { layers: { layer1: {} } } },
  },
};

// legacy form-based doc with an empty textBased stub next to formBased
const formBasedDocWithTextBasedStub: LensDocLike = {
  state: {
    query: kqlQuery,
    datasourceStates: {
      formBased: { layers: { layer1: {} } },
      textBased: {},
    },
  },
};

// freshly created ES|QL doc: textBased present, no layers yet
const newTextBasedDoc: LensDocLike = {
  state: { datasourceStates: { textBased: {} } },
};

describe('isTextBasedDoc', () => {
  it('returns true for documents with text-based layers', () => {
    expect(isTextBasedDoc(textBasedDoc)).toBe(true);
  });

  it('returns true for a new text-based document without layers or form-based layers', () => {
    expect(isTextBasedDoc(newTextBasedDoc)).toBe(true);
  });

  it('returns false for form-based documents', () => {
    expect(isTextBasedDoc(formBasedDoc)).toBe(false);
  });

  it('returns false for form-based documents with an empty textBased stub', () => {
    expect(isTextBasedDoc(formBasedDocWithTextBasedStub)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isTextBasedDoc(undefined)).toBe(false);
  });
});

describe('getTextBasedLayerQueries', () => {
  it('returns all layer queries in layer order', () => {
    expect(getTextBasedLayerQueries(textBasedDoc)).toEqual([esqlQuery, esqlQuery2]);
  });

  it('skips layers without a query', () => {
    expect(getTextBasedLayerQueries(legacySlotOnlyDoc)).toEqual([]);
  });

  it('returns an empty array for form-based documents', () => {
    expect(getTextBasedLayerQueries(formBasedDoc)).toEqual([]);
  });
});

describe('getDocQuery', () => {
  it('returns the first layer query for text-based documents', () => {
    expect(getDocQuery(textBasedDoc)).toEqual(esqlQuery);
  });

  it('prefers the authoritative layer query over a stale slot copy', () => {
    expect(getDocQuery(legacyDualWrittenDoc)).toEqual(esqlQuery);
  });

  it('falls back to the legacy aggregate slot copy when layers carry no query', () => {
    expect(getDocQuery(legacySlotOnlyDoc)).toEqual(esqlQuery);
  });

  it('returns the chart-scoped filter for form-based documents', () => {
    expect(getDocQuery(formBasedDoc)).toEqual(kqlQuery);
  });

  it('returns undefined for slot-less documents without layer queries', () => {
    expect(getDocQuery(newTextBasedDoc)).toBeUndefined();
  });
});

describe('getChartScopedFilterQuery', () => {
  it('passes through KQL/Lucene queries', () => {
    expect(getChartScopedFilterQuery(kqlQuery)).toEqual(kqlQuery);
  });

  it('ignores legacy aggregate slot values', () => {
    expect(getChartScopedFilterQuery(esqlQuery)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(getChartScopedFilterQuery(undefined)).toBeUndefined();
  });
});
