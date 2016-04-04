import sinon from 'auto-release-sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';

import SegmentedRequestProvider from '../segmented';
import SearchRequestProvider from '../search';

describe('ui/courier/fetch/request/segmented', () => {
  let Promise;
  let $rootScope;
  let SegmentedReq;
  let segmentedReq;
  let searchReqStart;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject((Private, $injector) => {
    Promise = $injector.get('Promise');
    $rootScope = $injector.get('$rootScope');
    SegmentedReq = Private(SegmentedRequestProvider);
    searchReqStart = sinon.spy(Private(SearchRequestProvider).prototype, 'start');
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

    it('calls super.start() synchronously', () => {
      expect(searchReqStart.called).to.be(true);
    });
  });

  function init() {
    segmentedReq = new SegmentedReq(mockSource());
  }

  function mockSource() {
    return {
      get: sinon.stub().returns(mockIndexPattern())
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
