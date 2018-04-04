import sinon from 'sinon';

export function createCourierStub() {
  return {
    indexPatterns: {
      get: sinon.spy((indexPatternId) => Promise.resolve({
        id: indexPatternId,
      })),
    },
  };
}

export function createSearchSourceStubProvider(hits, timeField) {
  const searchSourceStub = {
    _stubHits: hits,
    _stubTimeField: timeField,
    _createStubHit: (timestamp, tiebreaker = 0) => ({
      [searchSourceStub._stubTimeField]: timestamp,
      sort: [timestamp, tiebreaker],
    })
  };


  searchSourceStub.filter = sinon.stub().returns(searchSourceStub);
  searchSourceStub.inherits = sinon.stub().returns(searchSourceStub);
  searchSourceStub.set = sinon.stub().returns(searchSourceStub);
  searchSourceStub.get = sinon.spy(function (key) {
    const previousSetCall = searchSourceStub.set.withArgs(key).lastCall;
    return previousSetCall ? previousSetCall.args[1] : null;
  });
  searchSourceStub.fetchAsRejectablePromise = sinon.spy(function () {
    const lastQuery = searchSourceStub.set.withArgs('query').lastCall.args[1];
    const timeRange = lastQuery.query.constant_score.filter.range[searchSourceStub._stubTimeField];
    const filteredHits = searchSourceStub._stubHits.filter((hit) => (
      hit[searchSourceStub._stubTimeField] >= timeRange.gte &&
      hit[searchSourceStub._stubTimeField] <= timeRange.lte
    ));
    return Promise.resolve({
      hits: {
        hits: filteredHits,
        total: filteredHits.length,
      },
    });
  });

  return function SearchSourceStubProvider() {
    return searchSourceStub;
  };
}