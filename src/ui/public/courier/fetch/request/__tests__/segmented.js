import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';

import { SegmentedRequestProvider } from '../segmented';
import { SearchRequestProvider } from '../search_request';

describe('SegmentedRequestProvider', () => {
  let Promise;
  let SegmentedReq;
  let segmentedReq;
  let abstractReqStart;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject((Private, $injector) => {
    Promise = $injector.get('Promise');
    SegmentedReq = Private(SegmentedRequestProvider);

    const SearchRequest = Private(SearchRequestProvider);
    abstractReqStart = sinon.stub(SearchRequest.prototype, 'start', () => {
      const promise = Promise.resolve();
      sinon.spy(promise, 'then');
      return promise;
    });
  }));

  describe('#start()', () => {
    let returned;
    beforeEach(() => {
      init();
      returned = segmentedReq.start();
    });

    it('returns promise', () => {
      expect(returned.then).to.be.Function;
    });

    it('calls AbstractReq#start()', () => {
      sinon.assert.calledOnce(abstractReqStart);
    });

    it('listens to promise from super.start()', () => {
      sinon.assert.calledOnce(abstractReqStart);
      const promise = abstractReqStart.firstCall.returnValue;
      sinon.assert.calledOnce(promise.then);
    });
  });

  function init() {
    segmentedReq = new SegmentedReq(mockSource());
  }

  function mockSource() {
    return {
      get: sinon.stub().returns(mockIndexPattern()),
    };
  }

  function mockIndexPattern() {
    return {
      toDetailedIndexList: sinon.stub().returns(Promise.resolve([
        { index: 1, min: 0, max: 1 },
        { index: 2, min: 0, max: 1 },
        { index: 3, min: 0, max: 1 },
      ]))
    };
  }
});
