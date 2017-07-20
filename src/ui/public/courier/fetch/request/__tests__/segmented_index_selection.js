import ngMock from 'ng_mock';
import expect from 'expect.js';
import { times } from 'lodash';
import sinon from 'sinon';

import HitSortFnProv from 'plugins/kibana/discover/_hit_sort_fn';
import NoDigestPromises from 'test_utils/no_digest_promises';
import StubbedSearchSourceProvider from 'fixtures/stubbed_search_source';

import { SegmentedRequestProvider } from '../segmented';

describe('Segmented Request Index Selection', function () {
  let Promise;
  let SegmentedReq;
  let MockSource;
  let HitSortFn;

  NoDigestPromises.activateForSuite();

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private, $injector) => {
    Promise = $injector.get('Promise');
    HitSortFn = Private(HitSortFnProv);
    SegmentedReq = Private(SegmentedRequestProvider);

    MockSource = class {
      constructor() {
        return $injector.invoke(StubbedSearchSourceProvider);
      }
    };
  }));

  it('queries with size until all 500 docs returned', async function () {
    const search = new MockSource();
    const indexPattern = search.get('index');
    sinon.stub(indexPattern, 'toDetailedIndexList').returns(Promise.resolve([
      { index: 'one', min: 0, max: 1 },
      { index: 'two', min: 0, max: 1 },
      { index: 'three', min: 0, max: 1 },
      { index: 'four', min: 0, max: 1 },
      { index: 'five', min: 0, max: 1 },
    ]));

    const req = new SegmentedReq(search);
    req._handle.setDirection('desc');
    req._handle.setSortFn(new HitSortFn('desc'));
    req._handle.setSize(500);
    await req.start();

    // first 200
    expect((await req.getFetchParams()).body.size).to.be(500);
    await req.handleResponse({
      hits: { total: 1000, hits: times(200, (i) => ({ i })) }
    });

    // total = 400
    expect((await req.getFetchParams()).body.size).to.be(500);
    await req.handleResponse({
      hits: { total: 1000, hits: times(200, (i) => ({ i })) }
    });

    // total = 600
    expect((await req.getFetchParams()).body.size).to.be(500);
    await req.handleResponse({
      hits: { total: 1000, hits: times(200, (i) => ({ i })) }
    });

    expect((await req.getFetchParams()).body.size).to.be(0);
    await req.handleResponse({
      hits: { total: 1000, hits: times(200, (i) => ({ i })) }
    });

    expect((await req.getFetchParams()).body.size).to.be(0);
    await req.handleResponse({
      hits: { total: 1000, hits: times(200, (i) => ({ i })) }
    });
  });

  it(`sets size 0 for indices that couldn't procude hits`, async function () {
    const search = new MockSource();
    const indexPattern = search.get('index');

    // the segreq is looking for 10 documents, and we will give it ten docs with time:5 in the first response.
    // on the second index it should still request 10 documents because it could produce documents with time:5.
    // the next two indexes will get size 0, since they couldn't produce documents with the time:5
    // the final index will get size:10, because it too can produce docs with time:5
    sinon.stub(indexPattern, 'toDetailedIndexList').returns(Promise.resolve([
      { index: 'one', min: 0, max: 10 },
      { index: 'two', min: 0, max: 10 },
      { index: 'three', min: 12, max: 20 },
      { index: 'four', min: 15, max: 20 },
      { index: 'five', min: 5, max: 50 },
    ]));

    const req = new SegmentedReq(search);
    req._handle.setDirection('desc');
    req._handle.setSortFn(new HitSortFn('desc'));
    req._handle.setSize(10);
    await req.start();

    // first 10
    expect((await req.getFetchParams()).body.size).to.be(10);
    await req.handleResponse({
      hits: { total: 1000, hits: times(10, () => ({ _source: { time: 5 } })) }
    });

    // total = 400
    expect((await req.getFetchParams()).body.size).to.be(10);
    await req.handleResponse({
      hits: { total: 1000, hits: times(10, () => ({ _source: { time: 5 } })) }
    });

    // total = 600
    expect((await req.getFetchParams()).body.size).to.be(0);
    await req.handleResponse({
      hits: { total: 1000, hits: [] }
    });

    expect((await req.getFetchParams()).body.size).to.be(0);
    await req.handleResponse({
      hits: { total: 1000, hits: [] }
    });

    expect((await req.getFetchParams()).body.size).to.be(10);
    await req.handleResponse({
      hits: { total: 1000, hits: times(10, () => ({ _source: { time: 5 } })) }
    });
  });
});
