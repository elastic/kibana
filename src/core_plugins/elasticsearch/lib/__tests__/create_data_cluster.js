import expect from 'expect.js';
import sinon from 'sinon';
import { set, get, partial } from 'lodash';
import { createDataCluster } from '../create_data_cluster';

describe('plugins/elasticsearch', function () {
  describe('create_data_cluster', function () {
    let cluster;
    let server;
    let config;

    beforeEach(() => {
      config = {
        elasticsearch: {
          url: 'http://localhost:9200',
          logQueries: true
        }
      };

      server = sinon.spy();

      cluster = {
        close: sinon.spy()
      };

      set(server, 'plugins.elasticsearch.createCluster', sinon.mock().returns(cluster));
      set(server, 'on', sinon.spy());

      server.config = () => {
        return { get: partial(get, config) };
      };
    });

    it('creates the cluster with elasticsearch config', () => {
      createDataCluster(server);

      const { createCluster } = server.plugins.elasticsearch;

      sinon.assert.calledOnce(createCluster);
      expect(createCluster.getCall(0).args[0]).to.eql('data');
      expect(createCluster.getCall(0).args[1].url).to.eql('http://localhost:9200');
    });

    it('creates the cluster with elasticsearch.tribe config', () => {
      config.elasticsearch.tribe = {
        url: 'http://localhost:9201'
      };

      createDataCluster(server);

      const { createCluster } = server.plugins.elasticsearch;

      sinon.assert.calledOnce(createCluster);
      expect(createCluster.getCall(0).args[0]).to.eql('data');
      expect(createCluster.getCall(0).args[1].url).to.eql('http://localhost:9201');
    });

    it('sets client logger for cluster options', () => {
      createDataCluster(server);

      const { createCluster } = server.plugins.elasticsearch;
      const firstCall = createCluster.getCall(0);
      const Log = firstCall.args[1].log;
      const logger = new Log;

      sinon.assert.calledOnce(createCluster);
      expect(firstCall.args[0]).to.eql('data');
      expect(firstCall.args[1].url).to.eql('http://localhost:9200');
      expect(logger.tags).to.eql(['data']);
      expect(logger.logQueries).to.eql(true);
    });

    it('close cluster of server close', () => {
      createDataCluster(server);

      const clusterClose = server.on.getCall(0).args[1];

      clusterClose();

      sinon.assert.calledOnce(cluster.close);
      sinon.assert.calledOnce(server.on);
      expect(server.on.getCall(0).args[0]).to.eql('close');
    });
  });
});
