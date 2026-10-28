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
  getEsqlMissingMetadataExample,
  getExpandedDocLinkDisabledReason,
  getExpandedDocLinkability,
  getExpandedDocRef,
  matchesExpandedDocRef,
} from './expanded_doc';

describe('getExpandedDocRef', () => {
  it('builds a reference from a document', () => {
    const doc = buildDataTableRecord({ _id: '1', _index: 'i' }, dataViewMock);

    expect(getExpandedDocRef(doc)).toEqual({ id: '1', index: 'i' });
  });

  it('includes routing in the document reference', () => {
    const doc = buildDataTableRecord({ _id: '1', _index: 'i', _routing: 'route-1' }, dataViewMock);

    expect(getExpandedDocRef(doc)).toEqual({ id: '1', index: 'i', routing: 'route-1' });
  });

  it('returns undefined for a record without a stable identity', () => {
    const esqlRow = buildDataTableRecord({ _source: { message: 'no metadata' } }, dataViewMock);

    expect(getExpandedDocRef(esqlRow)).toBeUndefined();
    expect(getExpandedDocRef(undefined)).toBeUndefined();
  });
});

describe('matchesExpandedDocRef', () => {
  it('matches on the raw fields rather than the composed doc ID', () => {
    const doc = buildDataTableRecord({ _id: '1', _index: 'i', _routing: 'r' }, dataViewMock);

    expect(matchesExpandedDocRef(doc, { id: '1', index: 'i' })).toBe(true);
    expect(matchesExpandedDocRef(doc, { id: '1', index: 'i', routing: 'r' })).toBe(true);
    expect(matchesExpandedDocRef(doc, { id: '1', index: 'i', routing: 'other' })).toBe(false);
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

  it.each(['FROM logs METADATA _id, _index', 'TS metrics-* METADATA _id, _index'])(
    'reports a document from %s carrying _id/_index as linkable',
    (esql) => {
      expect(getExpandedDocLinkability({ esql }, docWithMetadata)).toBe(
        ExpandedDocLinkability.Linkable
      );
    }
  );

  it.each(['ROW message = "hello"', 'PROMQL index=metrics query="up"'])(
    'reports the %s source command as unsupported',
    (esql) => {
      expect(getExpandedDocLinkability({ esql }, docWithMetadata)).toBe(
        ExpandedDocLinkability.EsqlUnsupportedSource
      );
    }
  );

  it('reports an ES|QL document missing _id/_index as unlinkable', () => {
    // Linkability follows the open document, not later query edits.
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

describe('getExpandedDocLinkDisabledReason', () => {
  it('explains which source commands support links to individual results', () => {
    expect(getExpandedDocLinkDisabledReason(ExpandedDocLinkability.EsqlUnsupportedSource)).toBe(
      'Links to individual results are only available for FROM and TS queries.'
    );
  });

  it('explains how to include the required metadata in a FROM query', () => {
    expect(getExpandedDocLinkDisabledReason(ExpandedDocLinkability.EsqlMissingMetadata)).toBe(
      'Add "METADATA _id, _index" on the FROM or TS line to share this result.'
    );
  });
});

describe('getEsqlMissingMetadataExample', () => {
  it('uses the current FROM source in the example', () => {
    expect(getEsqlMissingMetadataExample('FROM logs-* | WHERE host.name == "web-01"')).toBe(
      'FROM logs-* METADATA _id, _index'
    );
  });

  it('uses the current TS source in the example', () => {
    expect(getEsqlMissingMetadataExample('TS metrics-* | LIMIT 100')).toBe(
      'TS metrics-* METADATA _id, _index'
    );
  });

  it('keeps comma-separated sources in the example', () => {
    expect(getEsqlMissingMetadataExample('FROM logs-*, events-*')).toBe(
      'FROM logs-*,events-* METADATA _id, _index'
    );
  });

  it('falls back to a generic FROM example when the source cannot be parsed', () => {
    expect(getEsqlMissingMetadataExample('')).toBe('FROM index METADATA _id, _index');
  });
});
