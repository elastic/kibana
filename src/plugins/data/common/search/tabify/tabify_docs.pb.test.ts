/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { fieldFormatsMock } from '../../../../field_formats/common/mocks';
import fc from 'fast-check';
import { tabifyDocs, TabifyDocsOptions, VALID_META_FIELD_NAMES } from './tabify_docs';
import { DataViewSpec, DataView } from 'src/plugins/data_views/common';

describe('Tabify docs', () => {
  it('does not throw for expected inputs', () => {
    fc.assert(
      fc.property(
        arbitraryHits().chain((hits) => arbitraryEsResponse(hits)),
        arbitraryDataViewInputs(),
        arbitraryTabifyDocsOptions(),
        (esResponse, dataViewInputs, options) => {
          const indexPattern = new DataView({ ...dataViewInputs, fieldFormats: fieldFormatsMock });
          expect(() => tabifyDocs(esResponse, indexPattern, options)).not.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('returns the same number of rows as hits', () => {
    fc.assert(
      fc.property(
        arbitraryHits().chain((hits) => arbitraryEsResponse(hits)),
        arbitraryDataViewInputs(),
        arbitraryTabifyDocsOptions(),
        (esResponse, dataViewInputs, options) => {
          const indexPattern = new DataView({ ...dataViewInputs, fieldFormats: fieldFormatsMock });
          expect(tabifyDocs(esResponse, indexPattern, options).rows.length).toBe(
            esResponse.hits.hits.length
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});

const option = <T>(arb: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> =>
  fc.option(arb, { nil: undefined });

function arbitraryDataViewInputs() {
  return fc.record({
    spec: fc.record<DataViewSpec>({
      allowNoIndex: fc.boolean(),
    }),
    shortDotsEnable: option(fc.boolean()),
    metaFields: option(fc.array(fc.constantFrom(...VALID_META_FIELD_NAMES))),
  });
}

function arbitraryHits(): fc.Arbitrary<estypes.SearchResponse['hits']['hits']> {
  return fc.array(
    fc.record<estypes.SearchHit>({
      _id: fc.uuid(),
      _index: fc.string(),
      fields: fc.object({
        key: fc.string({ minLength: 1, maxLength: 10 }),
        maxDepth: 2,
        maxKeys: 25,
      }),
      _type: fc.string(),
      _seq_no: fc.integer(),
    }),
    { maxLength: 250 }
  );
}

function arbitraryEsResponse(
  hits: estypes.SearchHit[]
): fc.Arbitrary<estypes.SearchResponse<unknown>> {
  return fc.record<estypes.SearchResponse<unknown>>({
    _shards: fc.record({
      failed: fc.integer(0, 10),
      skipped: fc.integer(0, 10),
      successful: fc.integer(0, 10),
      total: fc.integer(0, 10),
      failures: fc.array(
        fc.record({
          shard: fc.integer(),
          reason: fc.record({ type: fc.string(), reason: fc.string() }),
        })
      ),
    }),
    timed_out: fc.boolean(),
    took: fc.integer(0, 1000),
    hits: fc.record({
      total: fc.constant(hits.length),
      hits: fc.constant(hits),
      max_score: fc.float(),
    }),
  });
}

function arbitraryTabifyDocsOptions(): fc.Arbitrary<TabifyDocsOptions> {
  return fc.record({
    shallow: option(fc.boolean()),
    includeIgnoredValues: option(fc.boolean()),
    source: option(fc.boolean()),
  });
}
