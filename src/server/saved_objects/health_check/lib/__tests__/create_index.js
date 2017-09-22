import sinon from 'sinon';
import expect from 'expect.js';
import mappingsDsl from './fixtures/mappings';
import { createIndex } from '../create_index';

const index = '.my-kibana';

describe('savedObjects/healthCheck/createIndex', function () {
  it('should create with mappings, 1 shard, and default replicas, and wait for cluster.health', async () => {
    const callCluster = sinon.stub().returns({});

    await createIndex({
      index,
      mappingsDsl,
      callCluster,
    });

    sinon.assert.calledTwice(callCluster);

    sinon.assert.calledWithExactly(callCluster, 'indices.create', {
      index,
      body: {
        settings: {
          number_of_shards: 1,
        },
        mappings: mappingsDsl
      }
    });

    sinon.assert.calledWithExactly(callCluster, 'cluster.health', sinon.match({
      index,
      waitForStatus: 'yellow'
    }));
  });

  it('should reject with custom error message if create fails', async () => {
    const callCluster = sinon.stub().throws();

    try {
      await createIndex({
        index,
        mappingsDsl,
        callCluster,
      });

      throw new Error('Expected createIndex() to reject');
    } catch (error) {
      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'indices.create', sinon.match({ index }));
      expect(error).to.have.property('message', `Unable to create Kibana index "${index}"`);
    }
  });

  it('should reject custom error message if health check fails', async function () {
    const callCluster = sinon.stub().returns({});

    callCluster.withArgs('cluster.health', sinon.match({ index }))
      .throws();

    try {
      await createIndex({
        index,
        mappingsDsl,
        callCluster
      });

      throw new Error('Expected createKibanaIndex() to fail');
    } catch (error) {
      sinon.assert.calledTwice(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'indices.create', sinon.match({ index }));
      sinon.assert.calledWithExactly(callCluster, 'cluster.health', sinon.match({ index }));
      expect(error).to.have.property('message', `Waiting for Kibana index "${index}" to come online failed.`);
    }
  });
});
