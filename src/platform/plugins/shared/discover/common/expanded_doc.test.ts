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
  const docWithMetadata = buildDataTableRecord({ _id: '1', _index: 'i' }, dataViewMock);
  const docWithoutMetadata = buildDataTableRecord(
    { _source: { message: 'no metadata' } },
    dataViewMock
  );

  it('treats data view documents as linkable regardless of the document', () => {
    expect(getExpandedDocLinkability(undefined, undefined)).toBe(ExpandedDocLinkability.Linkable);
    expect(
      getExpandedDocLinkability({ query: 'response:200', language: 'kuery' }, docWithoutMetadata)
    ).toBe(ExpandedDocLinkability.Linkable);
  });

  it('reports an ES|QL document carrying _id/_index as linkable', () => {
    expect(
      getExpandedDocLinkability({ esql: 'FROM logs METADATA _id, _index' }, docWithMetadata)
    ).toBe(ExpandedDocLinkability.Linkable);
  });

  it('reports an ES|QL document missing _id/_index as unlinkable', () => {
    // Checked on the document itself rather than the query text, since a query edit does not
    // retroactively add the fields to a document expanded before the edit, and the fetch used to
    // restore a link does not depend on the current query requesting them either
    expect(
      getExpandedDocLinkability({ esql: 'FROM logs METADATA _id, _index' }, docWithoutMetadata)
    ).toBe(ExpandedDocLinkability.EsqlMissingMetadata);
    expect(getExpandedDocLinkability({ esql: 'FROM logs' }, undefined)).toBe(
      ExpandedDocLinkability.EsqlMissingMetadata
    );
  });

  it('reports a transformational ES|QL query as unlinkable regardless of the document', () => {
    expect(
      getExpandedDocLinkability({ esql: 'FROM logs | STATS count() BY host' }, docWithMetadata)
    ).toBe(ExpandedDocLinkability.EsqlTransformational);
    expect(
      getExpandedDocLinkability(
        { esql: 'FROM logs METADATA _id, _index | KEEP _id, _index, host' },
        docWithMetadata
      )
    ).toBe(ExpandedDocLinkability.EsqlTransformational);
  });
});
