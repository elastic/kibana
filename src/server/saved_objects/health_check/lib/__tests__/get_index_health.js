import sinon from 'sinon';
import expect from 'expect.js';

import { HEALTH, getIndexHealth } from '../get_index_health';

const index = '.some-kibana-index';

describe('savedObjects/healthCheck/getIndexHealth', () => {
  describe('call to cluster', () => {
    it('sets a timeout and ignores 408 responses', async () => {
      const callCluster = sinon.stub();

      await getIndexHealth({
        index,
        callCluster
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'cluster.health', sinon.match({
        index,
        timeout: sinon.match.string,
        ignore: [408]
      }));
    });
  });

  describe('timed_out: true', () => {
    it('returns NO_INDEX', async () => {
      const callCluster = sinon.stub()
        .withArgs('cluster.health', sinon.match({ index }))
          .returns({ timed_out: true, status: 'red' });

      expect(await getIndexHealth({ index, callCluster }))
        .to.be(HEALTH.NO_INDEX);
    });
  });

  describe('timed_out: false', () => {
    describe('status: green', () => {
      it('returns READY', async () => {
        const callCluster = sinon.stub()
          .withArgs('cluster.health', sinon.match({ index }))
            .returns({ timed_out: false, status: 'green' });

        expect(await getIndexHealth({ index, callCluster }))
          .to.be(HEALTH.READY);
      });
    });

    describe('status: yellow', () => {
      it('returns READY', async () => {
        const callCluster = sinon.stub()
          .withArgs('cluster.health', sinon.match({ index }))
            .returns({ timed_out: false, status: 'yellow' });

        expect(await getIndexHealth({ index, callCluster }))
          .to.be(HEALTH.READY);
      });
    });

    describe('status: red', () => {
      it('returns INITIALIZING', async () => {
        const callCluster = sinon.stub()
          .withArgs('cluster.health', sinon.match({ index }))
            .returns({ timed_out: false, status: 'red' });

        expect(await getIndexHealth({ index, callCluster }))
          .to.be(HEALTH.INITIALIZING);
      });
    });
  });

  describe('cluster.health returns nothing somehow', () => {
    it('returns NO_INDEX', async () => {
      const callCluster = sinon.stub()
        .withArgs('cluster.health', sinon.match({ index }))
          .returns();

      expect(await getIndexHealth({ index, callCluster }))
        .to.be(HEALTH.NO_INDEX);
    });
  });
});
