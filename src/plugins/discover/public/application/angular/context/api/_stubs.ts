/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';
import moment from 'moment';

import { IndexPatternsContract } from '../../../../../../data/public';
import { EsHitRecord, EsHitRecordList } from './context';

export function createIndexPatternsStub() {
  return ({
    get: sinon.spy((indexPatternId) =>
      Promise.resolve({
        id: indexPatternId,
        isTimeNanosBased: () => false,
        popularizeField: () => {},
      })
    ),
  } as unknown) as IndexPatternsContract;
}

/**
 * A stubbed search source with a `fetch` method that returns all of `_stubHits`.
 */
export function createSearchSourceStub(hits: Array<Partial<EsHitRecord>>, timeField?: string) {
  const searchSourceStub: any = {
    _stubHits: hits,
    _stubTimeField: timeField,
    _createStubHit: (timestamp: number, tiebreaker = 0) => ({
      [searchSourceStub._stubTimeField]: timestamp,
      sort: [timestamp, tiebreaker],
    }),
    setParent: sinon.spy(() => searchSourceStub),
    setField: sinon.spy(() => searchSourceStub),
    removeField: sinon.spy(() => searchSourceStub),
    getField: sinon.spy((key) => {
      const previousSetCall = searchSourceStub.setField.withArgs(key).lastCall;
      return previousSetCall ? previousSetCall.args[1] : null;
    }),
    fetch: sinon.spy(() =>
      Promise.resolve({
        hits: {
          hits: searchSourceStub._stubHits,
          total: searchSourceStub._stubHits.length,
        },
      })
    ),
  };
  return searchSourceStub;
}

/**
 * A stubbed search source with a `fetch` method that returns a filtered set of `_stubHits`.
 */
export function createContextSearchSourceStub(hits: EsHitRecordList, timeFieldName = '@timestamp') {
  const searchSourceStub = createSearchSourceStub(hits, timeFieldName);

  searchSourceStub.fetch = sinon.spy(() => {
    const timeField: keyof EsHitRecord = searchSourceStub._stubTimeField;
    const lastQuery = searchSourceStub.setField.withArgs('query').lastCall.args[1];
    const timeRange = lastQuery.query.bool.must.constant_score.filter.range[timeField];
    const lastSort = searchSourceStub.setField.withArgs('sort').lastCall.args[1];
    const sortDirection = lastSort[0][timeField].order;
    const sortFunction =
      sortDirection === 'asc'
        ? (first: any, second: any) => first[timeField] - second[timeField]
        : (first: any, second: any) => second[timeField] - first[timeField];
    const filteredHits = searchSourceStub._stubHits
      .filter(
        (hit: EsHitRecord) =>
          moment(hit[timeField]).isSameOrAfter(timeRange.gte) &&
          moment(hit[timeField]).isSameOrBefore(timeRange.lte)
      )
      .sort(sortFunction);

    return Promise.resolve({
      hits: {
        hits: filteredHits,
        total: filteredHits.length,
      },
    });
  });

  return searchSourceStub as sinon.SinonStub;
}
