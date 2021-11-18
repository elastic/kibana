/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import fc from 'fast-check';
import { tabifyDocs } from './tabify_docs';

function arbitraryHits(): fc.Arbitrary<estypes.SearchResponse['hits']['hits']> {
  return fc.array(
    fc.record<estypes.SearchHit>({
      _id: fc.string(),
      _index: fc.string(),
      fields: fc.object(),
      _type: fc.string(),
      _seq_no: fc.integer(),
    }),
    { minLength: 1000 }
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

describe('Tabify docs', () => {
  it('does not throw for expected inputs', () => {
    fc.assert(
      fc.property(
        arbitraryHits().chain((hits) => arbitraryEsResponse(hits)),
        (esResponse) => {
          expect(() => tabifyDocs(esResponse)).not.toThrow();
        }
      )
    );
  });
});
