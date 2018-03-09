import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

import { fetchContextProvider } from '../context';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('function fetchSuccessors', function () {
    let fetchSuccessors;
    let getSearchSourceStub;

    beforeEach(ngMock.module(function createServiceStubs($provide) {
      $provide.value('courier', createCourierStub());
    }));

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      getSearchSourceStub = createSearchSourceStubProvider([], '@timestamp', MS_PER_DAY * 8);
      Private.stub(SearchSourceProvider, getSearchSourceStub);

      fetchSuccessors = Private(fetchContextProvider).fetchSuccessors;
    }));

    it('should perform exactly one query when enough hits are returned', function () {
      const searchSourceStub = getSearchSourceStub();
      searchSourceStub._stubHits = [
        { '@timestamp': MS_PER_DAY * 5 },
        { '@timestamp': MS_PER_DAY * 4 },
        { '@timestamp': MS_PER_DAY * 3 },
        { '@timestamp': MS_PER_DAY * 2.9 },
        { '@timestamp': MS_PER_DAY * 2.8 },
      ];

      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 3,
        '_doc',
        'asc',
        0,
        3,
        []
      )
        .then((hits) => {
          expect(searchSourceStub.fetchAsRejectablePromise.calledOnce).to.be(true);
          expect(hits).to.eql(searchSourceStub._stubHits.slice(-3));
        });
    });

    it('should perform multiple queries up to the max timestamp when too few hits are returned', function () {
      const searchSourceStub = getSearchSourceStub();
      searchSourceStub._stubHits = [
        { '@timestamp': MS_PER_DAY * 5 },
        { '@timestamp': MS_PER_DAY * 4 },
        { '@timestamp': MS_PER_DAY * 3 },
        { '@timestamp': MS_PER_DAY * 2 },
        { '@timestamp': MS_PER_DAY * 1 },
      ];

      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 3,
        '_doc',
        'asc',
        0,
        6,
        []
      )
        .then((hits) => {
          expect(searchSourceStub.set.calledWith('aggs')).to.be(true);

          // "end of day 2" until "end of day 3"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 2,
                      lte: MS_PER_DAY * 3,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          // "end of day 1" until "end of day 3"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 1,
                      lte: MS_PER_DAY * 3,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          // "day 0" until "end of day 3"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: 0,
                      lte: MS_PER_DAY * 3,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          expect(searchSourceStub.fetchAsRejectablePromise.callCount).to.be(4);
          expect(hits).to.eql(searchSourceStub._stubHits.slice(-3));
        });
    });

    it('should perform multiple queries until the expected hit count is returned', function () {
      const searchSourceStub = getSearchSourceStub();
      searchSourceStub._stubHits = [
        { '@timestamp': MS_PER_DAY * 8 },
        { '@timestamp': MS_PER_DAY * 7 },
        { '@timestamp': MS_PER_DAY * 6 },
        { '@timestamp': MS_PER_DAY * 5 },
        { '@timestamp': MS_PER_DAY * 2 },
        { '@timestamp': MS_PER_DAY * 1 },
      ];

      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 8,
        '_doc',
        'asc',
        0,
        4,
        []
      )
        .then((hits) => {
          expect(searchSourceStub.set.calledWith('aggs')).to.be(true);

          // "end of day 7" until "end of day 8"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 7,
                      lte: MS_PER_DAY * 8,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          // "end of day 6" until "end of day 8"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 6,
                      lte: MS_PER_DAY * 8,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          // "end of day 4" until "end of day 8"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 4,
                      lte: MS_PER_DAY * 8,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          expect(searchSourceStub.fetchAsRejectablePromise.callCount).to.be(4);
          expect(hits).to.eql(searchSourceStub._stubHits.slice(0, 4));
        });
    });

    it('should return an empty array when no hits were found', function () {
      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 3,
        '_doc',
        'asc',
        0,
        3,
        []
      )
        .then((hits) => {
          expect(hits).to.eql([]);
        });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      const searchSourceStub = getSearchSourceStub();

      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 3,
        '_doc',
        'asc',
        0,
        3,
        []
      )
        .then(() => {
          const inheritsSpy = searchSourceStub.inherits;
          expect(inheritsSpy.alwaysCalledWith(false)).to.be(true);
          expect(inheritsSpy.called).to.be(true);
        });
    });
  });
});


function createCourierStub() {
  return {
    indexPatterns: {
      get: sinon.spy((indexPatternId) => Promise.resolve({
        id: indexPatternId,
      })),
    },
  };
}

function createSearchSourceStubProvider(hits, timeField, maxTimeValue) {
  const searchSourceStub = {
    _stubHits: hits,
    _stubTimeField: timeField,
    _stubMaxTimeValue: maxTimeValue,
  };


  searchSourceStub.filter = sinon.stub().returns(searchSourceStub);
  searchSourceStub.inherits = sinon.stub().returns(searchSourceStub);
  searchSourceStub.set = sinon.stub().returns(searchSourceStub);
  searchSourceStub.get = sinon.stub().returns(null);
  searchSourceStub.fetchAsRejectablePromise = sinon.spy(function () {
    const maxTimeAgg = {
      max_time: {
        max: {
          field: searchSourceStub._stubTimeField,
        },
      },
    };

    if (searchSourceStub.set.lastCall.calledWith('aggs', sinon.match(maxTimeAgg))) {
      return Promise.resolve({
        aggregations: {
          max_time: {
            value: searchSourceStub._stubMaxTimeValue,
          },
        },
      });
    } else {
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
    }
  });

  return function SearchSourceStubProvider() {
    return searchSourceStub;
  };
}
