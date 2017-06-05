import expect from 'expect.js';
import { createClusters } from '../create_clusters';
import { Cluster } from '../cluster';
import sinon from 'sinon';
import { partial } from 'lodash';

describe('plugins/elasticsearch', function () {
  describe('createClusters', function () {
    let clusters;
    let server;

    beforeEach(() => {
      server = {
        plugins: {
          elasticsearch: {}
        },
        expose: sinon.mock()
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
        expect(cluster).to.be.a(Cluster);
      });

      it('persists the cluster', () => {
        expect(clusters.get('admin')).to.be.a(Cluster);
      });

      it('throws if cluster already exists', () => {
        const fn = partial(clusters.create, 'admin', config);
        expect(fn).to.throwException(/cluster \'admin\' already exists/);
      });
    });
  });
});
