import ngMock from 'ng_mock';
import expect from 'expect.js';

import HitSortFnProv from 'plugins/kibana/discover/_hit_sort_fn';
import NoDigestPromises from 'test_utils/no_digest_promises';
import StubbedSearchSourceProvider from 'fixtures/stubbed_search_source';

import { SegmentedRequestProvider } from '../segmented';

describe('Segmented Request Size Picking', function () {
  let SegmentedReq;
  let MockSource;
  let HitSortFn;

  NoDigestPromises.activateForSuite();

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private, $injector) => {
    HitSortFn = Private(HitSortFnProv);
    SegmentedReq = Private(SegmentedRequestProvider);

    MockSource = class {
      constructor() {
        return $injector.invoke(StubbedSearchSourceProvider);
      }
    };
  }));

  describe('without a size', function () {
    it('does not set the request size', async function () {
      const req = new SegmentedReq(new MockSource());
      req._handle.setDirection('desc');
      req._handle.setSortFn(new HitSortFn('desc'));
      await req.start();

      expect((await req.getFetchParams()).body).to.not.have.property('size');
    });
  });

  describe('with a size', function () {
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
