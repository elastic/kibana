import ngMock from 'ng_mock';
import expect from 'expect.js';
import { times } from 'lodash';
import sinon from 'auto-release-sinon';

import HitSortFnProv from 'plugins/kibana/discover/_hit_sort_fn';
import NoDigestPromises from 'test_utils/no_digest_promises';
import StubbedSearchSourceProvider from 'fixtures/stubbed_search_source';

import SegmentedRequestProvider from '../segmented';

describe('Segmented Request Size Picking', function () {
  let Promise;
  let $rootScope;
  let SegmentedReq;
  let MockSource;
  let HitSortFn;

  NoDigestPromises.activateForSuite();

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private, $injector) => {
    Promise = $injector.get('Promise');
    HitSortFn = Private(HitSortFnProv);
    $rootScope = $injector.get('$rootScope');
    SegmentedReq = Private(SegmentedRequestProvider);

    MockSource = class {
      constructor() {
        return $injector.invoke(StubbedSearchSourceProvider);
      }
    };
  }));

  context('without a size', function () {
    it('does not set the request size', async function () {
      const req = new SegmentedReq(new MockSource());
      req._handle.setDirection('desc');
      req._handle.setSortFn(new HitSortFn('desc'));
      await req.start();

      expect((await req.getFetchParams()).body).to.not.have.property('size');
    });
  });

  context('with a size', function () {
    it('sets the request size to the entire desired size', async function () {
      const req = new SegmentedReq(new MockSource());
      req._handle.setDirection('desc');
      req._handle.setSize(555);
      req._handle.setSortFn(new HitSortFn('desc'));
      await req.start();

      expect((await req.getFetchParams()).body).to.have.property('size', 555);
    });
  });
});
