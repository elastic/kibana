import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { createCourierStub, createSearchSourceStubProvider } from './_stubs';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

import { fetchContextProvider } from '../context';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('function fetchPredecessors', function () {
    let fetchPredecessors;
    let getSearchSourceStub;

    beforeEach(ngMock.module(function createServiceStubs($provide) {
      $provide.value('courier', createCourierStub());
    }));

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      getSearchSourceStub = createSearchSourceStubProvider([], '@timestamp', MS_PER_DAY * 8);
      Private.stub(SearchSourceProvider, getSearchSourceStub);

      fetchPredecessors = Private(fetchContextProvider).fetchPredecessors;
    }));

    it('should perform exactly one query when enough hits are returned', function () {
      const searchSourceStub = getSearchSourceStub();
      searchSourceStub._stubHits = [
        { '@timestamp': MS_PER_DAY * 3.2 },
        { '@timestamp': MS_PER_DAY * 3.1 },
        { '@timestamp': MS_PER_DAY * 3 },
        { '@timestamp': MS_PER_DAY * 2 },
        { '@timestamp': MS_PER_DAY * 1 },
      ];

      return fetchPredecessors(
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
          expect(hits).to.eql(searchSourceStub._stubHits.slice(0, 3).reverse());
        });
    });

    it('should perform multiple queries up to the max timestamp when too few hits are returned', function () {
      const searchSourceStub = getSearchSourceStub();
      searchSourceStub._stubHits = [
        { '@timestamp': MS_PER_DAY * 6 },
        { '@timestamp': MS_PER_DAY * 4 },
        { '@timestamp': MS_PER_DAY * 3 },
        { '@timestamp': MS_PER_DAY * 2 },
        { '@timestamp': MS_PER_DAY * 1 },
      ];

      return fetchPredecessors(
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

          // "end of day 3" until "end of day 4"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 3,
                      lte: MS_PER_DAY * 4,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          // "end of day 3" until "end of day 5"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 3,
                      lte: MS_PER_DAY * 5,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          // "end of day 3" until "end of day 7"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 3,
                      lte: MS_PER_DAY * 7,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          // "end of day 3" until "end of day 8"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 3,
                      lte: MS_PER_DAY * 8,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          expect(searchSourceStub.fetchAsRejectablePromise.callCount).to.be(5);
          expect(hits).to.eql(searchSourceStub._stubHits.slice(0, 3).reverse());
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

      return fetchPredecessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 1,
        '_doc',
        'asc',
        0,
        3,
        []
      )
        .then((hits) => {
          expect(searchSourceStub.set.calledWith('aggs')).to.be(true);

          // "end of day 1" until "end of day 2"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 1,
                      lte: MS_PER_DAY * 2,
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

          // "end of day 1" until "end of day 5"
          expect(searchSourceStub.set.calledWith('query', sinon.match({
            query: {
              constant_score: {
                filter: {
                  range: {
                    [searchSourceStub._stubTimeField]: {
                      gte: MS_PER_DAY * 1,
                      lte: MS_PER_DAY * 5,
                    },
                  },
                },
              },
            },
          }))).to.be(true);

          expect(searchSourceStub.fetchAsRejectablePromise.callCount).to.be(4);
          expect(hits).to.eql(searchSourceStub._stubHits.slice(-3).reverse());
        });
    });

    it('should return an empty array when no hits were found', function () {
      return fetchPredecessors(
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

      return fetchPredecessors(
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
