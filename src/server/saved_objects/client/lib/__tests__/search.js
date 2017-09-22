import sinon from 'sinon';
import expect from 'expect.js';
import Bluebird from 'bluebird';
import Chance from 'chance';
import Rx from 'rxjs/Rx';
import { times, flatten } from 'lodash';

import { createEsTestCluster } from '../../../../../test_utils/es';
import { createSearchResponse$ } from '../search';

describe('SavedObjectsClient/createSearchResponse$', () => {
  const chance = new Chance();
  const es = createEsTestCluster({ name: 'SavedObjectsClient' });
  const randomScroll = () => `${chance.integer({ min: 100, max: 200 })}s`;
  const INDEX = chance.word();
  const TYPE = chance.word();
  const SIZE = chance.integer({ min: 4, max: 10 });

  function assertRx(v) {
    expect(v).to.be.a(Rx.Observable);
  }

  function getCallCluster() {
    const callCluster = es.getCallCluster();
    // cast returned promises to bluebird promises so we can synchronously inspect them
    return sinon.spy((...args) => (
      Bluebird.resolve(callCluster(...args))
    ));
  }

  async function assertNoOpenSearchContexts() {
    const stats = await es.getClient().nodes.stats({
      level: 'indices'
    });

    const searchStats = Object.values(stats.nodes)[0].indices.search;
    const open = searchStats.open_contexts;

    if (open) {
      throw new Error(
        `expected there to be no open search contexts: ${JSON.stringify(searchStats)}`
      );
    }
  }

  before(async function () {
    this.timeout(es.getStartTimeout());
    await es.start();
    const client = es.getClient();

    await client.bulk({
      index: INDEX,
      type: TYPE,
      refresh: 'wait_for',
      body: flatten(times(SIZE, i => [
        { index: {} },
        { order: i },
      ]))
    });
  });

  after(async function () {
    await es.stop();
  });

  describe('general', () => {
    it('returns a subscribable object', () => {
      assertRx(createSearchResponse$());
    });

    it('emits an error when search params are invalid', async () => {
      const resp$ = createSearchResponse$({ invalidQueryParam: true }, es.getCallCluster());
      assertRx(resp$);

      try {
        await resp$.toPromise();
        throw new Error('expected observable to error');
      } catch (error) {
        expect(error.message).to.contain('illegal_argument_exception');
      }
    });

    it('emits an error when callCluster is not a function', async () => {
      const resp$ = createSearchResponse$({}, null);
      assertRx(resp$);

      try {
        await resp$.toPromise();
        throw new Error('expected observable to error');
      } catch (error) {
        expect(error.message).to.contain('callCluster is not a function');
      }
    });
  });

  describe('no scroll timeout', () => {
    it('just searches, does not scroll or clearScroll', async () => {
      const callCluster = getCallCluster();

      await assertNoOpenSearchContexts();
      const resp$ = createSearchResponse$({
        index: INDEX,
        type: TYPE,
        size: 2,
      }, callCluster);

      const responses = await resp$
        .toArray()
        .toPromise();

      await assertNoOpenSearchContexts();
      expect(responses).to.have.length(1);
      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'search', sinon.match({
        size: 2,
      }));
    });
  });

  describe('with scroll timeout', () => {
    it('returns search and scroll responses and calls clearScroll before completing', async () => {
      const callCluster = getCallCluster();
      const scroll = randomScroll();

      // ensure that we start at zero
      await assertNoOpenSearchContexts();

      // get all responses
      const responses = await createSearchResponse$({
        index: INDEX,
        type: TYPE,
        scroll,
        body: {
          size: 1,
        }
      }, callCluster)
        .toArray()
        .toPromise();

      expect(responses).to.have.length(SIZE);
      sinon.assert.callCount(callCluster, SIZE + 1);
      const searchCall = callCluster.firstCall;
      const clearScrollCall = callCluster.lastCall;

      // clearScroll must complete before searchResponse$ does
      // so there shouldn't be any search contexts anymore
      expect(clearScrollCall.returnValue.isResolved()).to.be(true);
      await assertNoOpenSearchContexts();

      // expect one search
      sinon.assert.calledWithExactly(searchCall, 'search', {
        index: INDEX,
        type: TYPE,
        scroll,
        body: sinon.match({
          size: 1
        })
      });

      // expect SIZE - 1 scrolls
      for (let i = 1; i < SIZE; i++) {
        sinon.assert.calledWithExactly(callCluster.getCall(i), 'scroll', {
          body: {
            scroll,
            scroll_id: responses[i - 1]._scroll_id
          }
        });
      }

      // expect one clearScroll that just sends the first received scrollId
      sinon.assert.calledWithExactly(clearScrollCall, 'clearScroll', {
        body: {
          scroll_id: responses[0]._scroll_id
        }
      });
    });

    it('stops scrolling if unsubscribed', async () => {
      const callCluster = getCallCluster();
      const scroll = randomScroll();
      await assertNoOpenSearchContexts();

      const responses = await createSearchResponse$({
        scroll,
        body: {
          size: 1,
        }
      }, callCluster)
        .take(2)
        .toArray()
        .toPromise();

      expect(responses).to.have.length(2);
      sinon.assert.callCount(callCluster, 3);
      const [searchCall, scrollCall, clearScrollCall] = callCluster.getCalls();

      // one search
      sinon.assert.calledWithExactly(searchCall, 'search', {
        scroll,
        body: {
          size: 1
        }
      });

      // one scroll
      sinon.assert.calledWithExactly(scrollCall, 'scroll', {
        body: {
          scroll,
          scroll_id: searchCall.returnValue.value()._scroll_id
        }
      });

      // one clearScroll
      sinon.assert.calledWithExactly(clearScrollCall, 'clearScroll', {
        body: {
          scroll_id: scrollCall.returnValue.value()._scroll_id
        }
      });

      // clearScroll should still be pending because we unsubscribed
      // without waiting for completion
      expect(clearScrollCall.returnValue.isPending()).to.be(true);

      // all search contexts should be closed after clearScroll resolves
      await clearScrollCall.returnValue;
      await assertNoOpenSearchContexts();
    });
  });

  describe('es error', () => {
    it('clears scroll before returning', async () => {
      const callCluster = getCallCluster();
      const scroll = randomScroll();
      const searchParams = {
        scroll,
        body: {
          size: 1,
        }
      };

      try {
        await createSearchResponse$(searchParams, (method, params) => {
          if (method === 'scroll') {
            throw new Error('test');
          }

          return callCluster(method, params);
        }).toPromise();

        throw new Error('expected searchResponse to error');
      } catch (error) {
        expect(error).to.have.property('message', 'test');
      }

      sinon.assert.calledTwice(callCluster);
      sinon.assert.calledWith(callCluster.firstCall, 'search');
      sinon.assert.calledWith(callCluster.secondCall, 'clearScroll');
      expect(callCluster.secondCall.returnValue.isResolved()).to.be(true);
      await assertNoOpenSearchContexts();
    });
  });

  describe('immediate unsubscribe', () => {
    it('waits for pending request, sends clearScroll with its scroll_id', async () => {
      const callCluster = getCallCluster();
      const scroll = randomScroll();
      const searchParams = {
        scroll,
        body: {
          size: 1,
        }
      };

      // shouldn't do anything until subscribe
      const searchResponse$ = createSearchResponse$(searchParams, callCluster);
      sinon.assert.notCalled(callCluster);
      await assertNoOpenSearchContexts();

      // even if the consumer takes their time subscribing
      await Bluebird.delay(1000);
      sinon.assert.notCalled(callCluster);
      await assertNoOpenSearchContexts();

      // first search should be immediately triggered on subscribe
      const sub = searchResponse$.subscribe();
      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(callCluster.firstCall, 'search', searchParams);

      // NOTE: we haven't waited for search to complete before unsub, so
      // request is still in progress and we are creating a scroll context
      // in elasticsearch as we speak

      // unsubscribe normally triggers a clearScroll synchronously, but since
      // our first request is in progress we don't know the scrollId to clear and
      // clearScroll$ must wait on the request before it can do anything
      sub.unsubscribe();
      sinon.assert.calledOnce(callCluster);

      // wait for search to complete just like clearScroll is
      await callCluster.firstCall.returnValue;

      // clearScroll now has the scrollId and should have properly
      // cleared it in elasticsearch
      sinon.assert.calledTwice(callCluster);
      sinon.assert.calledWithExactly(callCluster.secondCall, 'clearScroll', {
        body: {
          scroll_id: callCluster.firstCall.returnValue.value()._scroll_id
        }
      });

      // once clearScroll completes everything should be cleaned up
      await callCluster.secondCall.returnValue;
      await assertNoOpenSearchContexts();
    });
  });
});
