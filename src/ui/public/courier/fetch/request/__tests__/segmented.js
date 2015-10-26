describe('ui/courier/fetch/request/segmented', () => {
  const sinon = require('auto-release-sinon');
  const expect = require('expect.js');
  const ngMock = require('ngMock');

  let _Promise;
  let $rootScope;
  let SegmentedReq;
  let segmentedReq;
  let searchReqStart;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject((Private, Promise, $injector) => {
    _Promise = Promise;
    $rootScope = $injector.get('$rootScope');
    SegmentedReq = Private(require('ui/courier/fetch/request/segmented'));
    searchReqStart = sinon.spy(Private(require('ui/courier/fetch/request/search')).prototype, 'start');
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

    it('does not call super.start() until promise is resolved', () => {
      expect(searchReqStart.called).to.be(false);
      $rootScope.$apply();
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
    const queue = [1, 2, 3];
    return {
      toIndexList: sinon.stub().returns(_Promise.resolve(queue))
    };
  }
});
