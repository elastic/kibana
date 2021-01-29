/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import sinon from 'sinon';
import moment from 'moment';

export function createIndexPatternsStub() {
  return {
    get: sinon.spy((indexPatternId) =>
      Promise.resolve({
        id: indexPatternId,
        isTimeNanosBased: () => false,
        popularizeField: () => {},
      })
    ),
  };
}

/**
 * A stubbed search source with a `fetch` method that returns all of `_stubHits`.
 */
export function createSearchSourceStub(hits, timeField) {
  const searchSourceStub = {
    _stubHits: hits,
    _stubTimeField: timeField,
    _createStubHit: (timestamp, tiebreaker = 0) => ({
      [searchSourceStub._stubTimeField]: timestamp,
      sort: [timestamp, tiebreaker],
    }),
  };

  searchSourceStub.setParent = sinon.spy(() => searchSourceStub);
  searchSourceStub.setField = sinon.spy(() => searchSourceStub);
  searchSourceStub.removeField = sinon.spy(() => searchSourceStub);

  searchSourceStub.getField = sinon.spy((key) => {
    const previousSetCall = searchSourceStub.setField.withArgs(key).lastCall;
    return previousSetCall ? previousSetCall.args[1] : null;
  });

  searchSourceStub.fetch = sinon.spy(() =>
    Promise.resolve({
      hits: {
        hits: searchSourceStub._stubHits,
        total: searchSourceStub._stubHits.length,
      },
    })
  );

  return searchSourceStub;
}

/**
 * A stubbed search source with a `fetch` method that returns a filtered set of `_stubHits`.
 */
export function createContextSearchSourceStub(hits, timeField = '@timestamp') {
  const searchSourceStub = createSearchSourceStub(hits, timeField);

  searchSourceStub.fetch = sinon.spy(() => {
    const timeField = searchSourceStub._stubTimeField;
    const lastQuery = searchSourceStub.setField.withArgs('query').lastCall.args[1];
    const timeRange = lastQuery.query.bool.must.constant_score.filter.range[timeField];
    const lastSort = searchSourceStub.setField.withArgs('sort').lastCall.args[1];
    const sortDirection = lastSort[0][timeField];
    const sortFunction =
      sortDirection === 'asc'
        ? (first, second) => first[timeField] - second[timeField]
        : (first, second) => second[timeField] - first[timeField];
    const filteredHits = searchSourceStub._stubHits
      .filter(
        (hit) =>
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

  return searchSourceStub;
}
