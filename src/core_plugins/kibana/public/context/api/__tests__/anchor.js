import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

import { fetchAnchorProvider } from '../anchor';


describe('context app', function () {
  let fetchAnchor;
  let SearchSourceStub;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function createStubs(Private) {
    SearchSourceStub = createSearchSourceStubProvider([
      { _id: 'hit1' },
    ]);
    Private.stub(SearchSourceProvider, SearchSourceStub);

    fetchAnchor = Private(fetchAnchorProvider);
  }));

  describe('function fetchAnchor', function () {
    it('should use the `fetch` method of the SearchSource', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor(indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(() => {
          expect(searchSourceStub.fetch.calledOnce).to.be(true);
        });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor(indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(() => {
          const inheritsSpy = searchSourceStub.inherits;
          expect(inheritsSpy.calledOnce).to.be(true);
          expect(inheritsSpy.firstCall.args[0]).to.eql(false);
        });
    });

    it('should set the SearchSource index pattern', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor(indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(() => {
          const setIndexSpy = searchSourceStub.set.withArgs('index');
          expect(setIndexSpy.calledOnce).to.be(true);
          expect(setIndexSpy.firstCall.args[1]).to.eql(indexPatternStub);
        });
    });

    it('should set the SearchSource version flag to true', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor(indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(() => {
          const setVersionSpy = searchSourceStub.set.withArgs('version');
          expect(setVersionSpy.calledOnce).to.be(true);
          expect(setVersionSpy.firstCall.args[1]).to.eql(true);
        });
    });

    it('should set the SearchSource size to 1', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor(indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(() => {
          const setSizeSpy = searchSourceStub.set.withArgs('size');
          expect(setSizeSpy.calledOnce).to.be(true);
          expect(setSizeSpy.firstCall.args[1]).to.eql(1);
        });
    });

    it('should set the SearchSource query to a _uid terms query', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor(indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(() => {
          const setQuerySpy = searchSourceStub.set.withArgs('query');
          expect(setQuerySpy.calledOnce).to.be(true);
          expect(setQuerySpy.firstCall.args[1]).to.eql({
            terms: {
              _uid: ['UID'],
            },
          });
        });
    });

    it('should set the SearchSource sort order', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor(indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(() => {
          const setSortSpy = searchSourceStub.set.withArgs('sort');
          expect(setSortSpy.calledOnce).to.be(true);
          expect(setSortSpy.firstCall.args[1]).to.eql([
            { '@timestamp': 'desc' },
            { '_uid': 'asc' },
          ]);
        });
    });

    it('should reject with an error when no hits were found', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const searchSourceStub = new SearchSourceStub();
      searchSourceStub._stubHits = [];

      return fetchAnchor(indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(
          () => {
            expect().fail('expected the promise to be rejected');
          },
          (error) => {
            expect(error).to.be.an(Error);
          }
        );
    });

    it('should return the first hit after adding an anchor marker', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const searchSourceStub = new SearchSourceStub();
      searchSourceStub._stubHits = [
        { property1: 'value1' },
        { property2: 'value2' },
      ];

      return fetchAnchor(indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then((anchorDocument) => {
          expect(anchorDocument).to.have.property('property1', 'value1');
          expect(anchorDocument).to.have.property('$$_isAnchor', true);
        });
    });
  });
});


function createIndexPatternStub(indices) {
  return {
    getComputedFields: sinon.stub()
      .returns({}),
    toIndexList: sinon.stub()
      .returns(indices),
  };
}

function createSearchSourceStubProvider(hits) {
  const searchSourceStub = {
    _stubHits: hits,
  };

  searchSourceStub.inherits = sinon.stub().returns(searchSourceStub);
  searchSourceStub.set = sinon.stub().returns(searchSourceStub);
  searchSourceStub.fetch = sinon.spy(() => Promise.resolve({
    hits: {
      hits: searchSourceStub._stubHits,
      total: searchSourceStub._stubHits.length,
    },
  }));

  return function SearchSourceStubProvider() {
    return searchSourceStub;
  };
}
