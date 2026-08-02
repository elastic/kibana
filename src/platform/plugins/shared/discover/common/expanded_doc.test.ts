/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import {
  ExpandedDocLinkability,
  getExpandedDocLinkability,
  getExpandedDocRef,
  matchesExpandedDocRef,
} from './expanded_doc';

describe('getExpandedDocRef', () => {
  it('builds a reference from a document', () => {
    const doc = buildDataTableRecord({ _id: '1', _index: 'i' }, dataViewMock);

    expect(getExpandedDocRef(doc)).toEqual({ id: '1', index: 'i' });
  });

  it('returns undefined for a record without a stable identity', () => {
    // ES|QL rows only carry `_id` and `_index` when the query requests them via METADATA
    const esqlRow = buildDataTableRecord({ _source: { message: 'no metadata' } }, dataViewMock);

    expect(getExpandedDocRef(esqlRow)).toBeUndefined();
    expect(getExpandedDocRef(undefined)).toBeUndefined();
  });
});

describe('matchesExpandedDocRef', () => {
  it('matches on the raw fields rather than the composed doc ID', () => {
    // `_routing` contributes to the composed ID but is not part of the reference
    const doc = buildDataTableRecord({ _id: '1', _index: 'i', _routing: 'r' }, dataViewMock);

    expect(matchesExpandedDocRef(doc, { id: '1', index: 'i' })).toBe(true);
    expect(matchesExpandedDocRef(doc, { id: '1', index: 'other' })).toBe(false);
    expect(matchesExpandedDocRef(doc, { id: '2', index: 'i' })).toBe(false);
  });
});

describe('getExpandedDocLinkability', () => {
  it('treats data view queries as linkable', () => {
    expect(getExpandedDocLinkability(undefined)).toBe(ExpandedDocLinkability.Linkable);
    expect(getExpandedDocLinkability({ query: 'response:200', language: 'kuery' })).toBe(
      ExpandedDocLinkability.Linkable
    );
  });

  it('treats ES|QL queries requesting both metadata columns as linkable', () => {
    expect(getExpandedDocLinkability({ esql: 'FROM logs METADATA _id, _index' })).toBe(
      ExpandedDocLinkability.Linkable
    );
    expect(
      getExpandedDocLinkability({ esql: 'FROM logs METADATA _index, _id | WHERE a == 1' })
    ).toBe(ExpandedDocLinkability.Linkable);
  });

  it('reports ES|QL queries missing metadata columns', () => {
    expect(getExpandedDocLinkability({ esql: 'FROM logs' })).toBe(
      ExpandedDocLinkability.EsqlMissingMetadata
    );
    expect(getExpandedDocLinkability({ esql: 'FROM logs METADATA _id' })).toBe(
      ExpandedDocLinkability.EsqlMissingMetadata
    );
  });

  it('reports transformational ES|QL queries even when they carry the metadata columns', () => {
    expect(getExpandedDocLinkability({ esql: 'FROM logs | STATS count() BY host' })).toBe(
      ExpandedDocLinkability.EsqlTransformational
    );
    expect(
      getExpandedDocLinkability({ esql: 'FROM logs METADATA _id, _index | KEEP _id, _index, host' })
    ).toBe(ExpandedDocLinkability.EsqlTransformational);
  });
});
