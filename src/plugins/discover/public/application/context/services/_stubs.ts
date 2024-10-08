/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';
import moment from 'moment';
import { of } from 'rxjs';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { EsHitRecord } from '@kbn/discover-utils/types';

type SortHit = {
  [key in string]: number; // timeField name
} & {
  sort: [number, number];
};

/**
 * A stubbed search source with a `fetch` method that returns all of `_stubHits`.
 */
export function createSearchSourceStub(hits: EsHitRecord[], timeField?: string) {
  const requestResult = {
    id: 'Fjk5bndxTHJWU2FldVRVQ0tYR0VqOFEcRWtWNDhOdG5SUzJYcFhONVVZVTBJQToxMDMwOQ==',
    rawResponse: {
      took: 2,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        hits,
        total: hits.length,
      },
    },
    isPartial: false,
    isRunning: false,
    total: 1,
    loaded: 1,
    isRestored: false,
  } as unknown as IKibanaSearchResponse<estypes.SearchResponse<unknown>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchSourceStub: any = {
    _stubHits: hits,
    _stubTimeField: timeField,
    _createStubHit: (timestamp: number, tiebreaker = 0) => {
      const value = new Date(timestamp).toISOString();
      return {
        [searchSourceStub._stubTimeField]: value,
        sort: [value, tiebreaker],
      };
    },
    setParent: sinon.spy(() => searchSourceStub),
    setField: sinon.spy(() => searchSourceStub),
    removeField: sinon.spy(() => searchSourceStub),
    getField: sinon.spy((key) => {
      const previousSetCall = searchSourceStub.setField.withArgs(key).lastCall;
      return previousSetCall ? previousSetCall.args[1] : null;
    }),
    fetch$: sinon.spy(() => of(requestResult)),
  };
  return searchSourceStub;
}

/**
 * A stubbed search source with a `fetch` method that returns a filtered set of `_stubHits`.
 */
export function createContextSearchSourceStub(timeFieldName: string) {
  const searchSourceStub = createSearchSourceStub([], timeFieldName);

  searchSourceStub.fetch$ = sinon.spy(() => {
    const timeField: keyof SortHit = searchSourceStub._stubTimeField;
    const lastQuery = searchSourceStub.setField.withArgs('query').lastCall.args[1];
    const timeRange = lastQuery.query.bool.must.constant_score.filter.range[timeField];
    const lastSort = searchSourceStub.setField.withArgs('sort').lastCall.args[1];
    const sortDirection = lastSort[0][timeField].order;
    const sortFunction =
      sortDirection === 'asc'
        ? (first: SortHit, second: SortHit) => (first[timeField] < second[timeField] ? -1 : 1)
        : (first: SortHit, second: SortHit) => (second[timeField] < first[timeField] ? -1 : 1);
    const filteredHits = searchSourceStub._stubHits
      .filter(
        (hit: SortHit) =>
          moment(hit[timeField]).isSameOrAfter(moment(timeRange.gte)) &&
          moment(hit[timeField]).isSameOrBefore(moment(timeRange.lte))
      )
      .sort(sortFunction);

    return of({
      rawResponse: {
        hits: {
          hits: filteredHits,
          total: filteredHits.length,
        },
      },
    });
  });

  return searchSourceStub as sinon.SinonStub;
}
