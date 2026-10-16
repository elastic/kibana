/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isTextBasedAttributes,
  getTextBasedLayerQueries,
  getRepresentativeQuery,
  getChartScopedFilterQuery,
  withLegacyAggregateQuerySlot,
  type MinimalLensAttributes,
} from './lens_attributes_queries';

const kqlQuery = { query: 'bytes > 100', language: 'kuery' };
const esqlQuery = { esql: 'FROM index | LIMIT 10' };
const esqlQuery2 = { esql: 'FROM index2 | LIMIT 5' };

const textBasedDoc: MinimalLensAttributes = {
  state: {
    datasourceStates: {
      textBased: { layers: { layer1: { query: esqlQuery }, layer2: { query: esqlQuery2 } } },
    },
  },
};

const formBasedDoc: MinimalLensAttributes = {
  state: {
    query: kqlQuery,
    datasourceStates: { formBased: { layers: { layer1: {} } } },
  },
};

// legacy dual-written doc: stale aggregate copy in the slot
const legacyDualWrittenDoc: MinimalLensAttributes = {
  state: {
    query: { esql: 'FROM index | LIMIT 999' }, // diverged, stale
    datasourceStates: { textBased: { layers: { layer1: { query: esqlQuery } } } },
  },
};

// legacy doc that only carries the aggregate slot copy (no layer query)
const legacySlotOnlyDoc: MinimalLensAttributes = {
  state: {
    query: esqlQuery,
    datasourceStates: { textBased: { layers: { layer1: {} } } },
  },
};

// legacy form-based doc with an empty textBased stub next to formBased
const formBasedDocWithTextBasedStub: MinimalLensAttributes = {
  state: {
    query: kqlQuery,
    datasourceStates: {
      formBased: { layers: { layer1: {} } },
      textBased: {},
    },
  },
};

// freshly created ES|QL doc: textBased present, no layers yet
const newTextBasedDoc: MinimalLensAttributes = {
  state: { datasourceStates: { textBased: {} } },
};

describe('isTextBasedAttributes', () => {
  it('returns true for documents with text-based layers', () => {
    expect(isTextBasedAttributes(textBasedDoc)).toBe(true);
  });

  it('returns true for a new text-based document without layers or form-based layers', () => {
    expect(isTextBasedAttributes(newTextBasedDoc)).toBe(true);
  });

  it('returns false for form-based documents', () => {
    expect(isTextBasedAttributes(formBasedDoc)).toBe(false);
  });

  it('returns false for form-based documents with an empty textBased stub', () => {
    expect(isTextBasedAttributes(formBasedDocWithTextBasedStub)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isTextBasedAttributes(undefined)).toBe(false);
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

describe('getRepresentativeQuery', () => {
  it('returns the first layer query for text-based documents', () => {
    expect(getRepresentativeQuery(textBasedDoc)).toEqual(esqlQuery);
  });

  it('prefers the authoritative layer query over a stale slot copy', () => {
    expect(getRepresentativeQuery(legacyDualWrittenDoc)).toEqual(esqlQuery);
  });

  it('falls back to the legacy aggregate slot copy when layers carry no query', () => {
    expect(getRepresentativeQuery(legacySlotOnlyDoc)).toEqual(esqlQuery);
  });

  it('returns the chart-scoped filter for form-based documents', () => {
    expect(getRepresentativeQuery(formBasedDoc)).toEqual(kqlQuery);
  });

  it('returns undefined for slot-less documents without layer queries', () => {
    expect(getRepresentativeQuery(newTextBasedDoc)).toBeUndefined();
  });
});

describe('isTextBasedAttributes legacy indexpattern-era docs', () => {
  it('classifies unmigrated indexpattern-only documents as form-based', () => {
    // ≤8.5 vintage: `indexpattern` key, no `textBased` key (predates it)
    const legacyIndexPatternDoc: MinimalLensAttributes = {
      state: {
        query: kqlQuery,
        datasourceStates: { indexpattern: { layers: { layer1: {} } } },
      },
    };
    expect(isTextBasedAttributes(legacyIndexPatternDoc)).toBe(false);
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

describe('withLegacyAggregateQuerySlot', () => {
  it('mirrors the first layer query into an undefined slot', () => {
    const result = withLegacyAggregateQuerySlot(textBasedDoc);
    expect(result.state?.query).toEqual(esqlQuery);
  });

  it('mirrors the first layer query into an empty KQL default slot', () => {
    const doc: MinimalLensAttributes = {
      state: {
        ...textBasedDoc.state,
        query: { query: '', language: 'kuery' },
      },
    };
    expect(withLegacyAggregateQuerySlot(doc).state?.query).toEqual(esqlQuery);
  });

  it('refreshes a stale aggregate slot copy', () => {
    const result = withLegacyAggregateQuerySlot(legacyDualWrittenDoc);
    expect(result.state?.query).toEqual(esqlQuery);
  });

  it('never overwrites a chart-scoped KQL filter of a mixed document', () => {
    const mixedDoc: MinimalLensAttributes = {
      state: {
        query: kqlQuery,
        datasourceStates: {
          formBased: { layers: { layerA: {} } },
          textBased: { layers: { layer1: { query: esqlQuery } } },
        },
      },
    };
    expect(withLegacyAggregateQuerySlot(mixedDoc)).toBe(mixedDoc);
  });

  it('returns form-based documents unchanged', () => {
    expect(withLegacyAggregateQuerySlot(formBasedDoc)).toBe(formBasedDoc);
  });

  it('returns documents without layer queries unchanged', () => {
    expect(withLegacyAggregateQuerySlot(legacySlotOnlyDoc)).toBe(legacySlotOnlyDoc);
  });

  it('does not mutate the input', () => {
    const doc: MinimalLensAttributes = {
      state: { datasourceStates: { textBased: { layers: { layer1: { query: esqlQuery } } } } },
    };
    withLegacyAggregateQuerySlot(doc);
    expect(doc.state?.query).toBeUndefined();
  });
});
