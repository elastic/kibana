import expect from 'expect.js';
import { createClusters } from '../create_clusters';
import sinon from 'sinon';
import { partial } from 'lodash';
import Hapi from 'hapi';

import * as ClusterNS from '../cluster';

describe('plugins/elasticsearch', function () {
  describe('createClusters', function () {
    let clusters;
    let server;

    beforeEach(() => {
      server = {
        plugins: {
          elasticsearch: {}
        },
        expose: sinon.mock(),
        on: sinon.stub(),
      };

      clusters = createClusters(server);
    });

    describe('createCluster', () => {
      let cluster;
      const config = {
        url: 'http://localhost:9200',
        ssl: {
          verificationMode: 'none'
        }
      };

      beforeEach(() => {
        cluster = clusters.create('admin', config);
      });

      it('returns a cluster', () => {
        expect(cluster).to.be.a(ClusterNS.Cluster);
      });

      it('persists the cluster', () => {
        expect(clusters.get('admin')).to.be.a(ClusterNS.Cluster);
      });

      it('throws if cluster already exists', () => {
        const fn = partial(clusters.create, 'admin', config);
        expect(fn).to.throwException(/cluster \'admin\' already exists/);
      });
    });
  });

  describe('server stop', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
      sandbox.stub(ClusterNS, 'Cluster', function () {
        this.stub = true;
        this.close = sinon.stub();
      });
    });

    after(() => {
      sandbox.restore();
    });

    it('closes all clusters', async () => {
      const server = new Hapi.Server();
      server.connection({ port: 0 });
      const clusters = createClusters(server);
      const cluster = clusters.create('name', { config: true });
      expect(cluster).to.have.property('stub', true);
      sinon.assert.notCalled(cluster.close);
      await server.start();
      sinon.assert.notCalled(cluster.close);
      await server.stop();
      sinon.assert.calledOnce(cluster.close);
    });
  });
});
