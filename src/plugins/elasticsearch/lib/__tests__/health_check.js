var Promise = require('bluebird');
var sinon = require('sinon');
var expect = require('expect.js');
var NoConnections = require('elasticsearch').errors.NoConnections;

var healthCheck = require('../health_check');

describe('plugins/elasticsearch', function () {
  describe('lib/health_check', function () {

    var health, plugin, server, get, client;
    beforeEach(function () {
      // setup the plugin stub
      plugin = {
        name: 'elasticsearch',
        status: {
          red: sinon.stub(),
          green: sinon.stub(),
          yellow: sinon.stub()
        }
      };
      // setup the config().get() stub
      get = sinon.stub();
      // set up the elasticsearch client stub
      client = {
        cluster: { health: sinon.stub() },
        indices: { create: sinon.stub() },
        nodes: { info: sinon.stub() },
        ping: sinon.stub(),
        create: sinon.stub(),
        search: sinon.stub().returns(Promise.resolve({ hits: { hits: [] } })),
      };
      client.nodes.info.returns(Promise.resolve({
        nodes: {
          'node-01': {
            version: '1.5.0',
            http_address: 'inet[/127.0.0.1:9200]',
            ip: '127.0.0.1'
          }
        }
      }));
      // Setup the server mock
      server = {
        log: sinon.stub(),
        config: function () { return { get: get }; },
        plugins: { elasticsearch: { client: client  } }
      };

      health = healthCheck(plugin, server);
    });

    it('should set the cluster green if everything is ready', function () {
      get.withArgs('elasticsearch.minimumVerison').returns('1.4.4');
      get.withArgs('kibana.index').returns('.my-kibana');
      client.ping.returns(Promise.resolve());
      client.cluster.health.returns(Promise.resolve({ timed_out: false, status: 'green' }));
      return health.run()
        .then(function () {
          sinon.assert.calledOnce(plugin.status.yellow);
          expect(plugin.status.yellow.args[0][0]).to.be('Waiting for Elasticsearch');
          sinon.assert.calledOnce(client.ping);
          sinon.assert.calledOnce(client.nodes.info);
          sinon.assert.calledOnce(client.cluster.health);
          sinon.assert.calledOnce(plugin.status.green);
          expect(plugin.status.green.args[0][0]).to.be('Kibana index ready');
        });
    });

    it('should set the cluster red if the ping fails, then to green', function () {
      this.timeout(3000);
      get.withArgs('elasticsearch.url').returns('http://localhost:9200');
      get.withArgs('elasticsearch.minimumVerison').returns('1.4.4');
      get.withArgs('kibana.index').returns('.my-kibana');
      client.ping.onCall(0).returns(Promise.reject(new NoConnections()));
      client.ping.onCall(1).returns(Promise.resolve());
      client.cluster.health.returns(Promise.resolve({ timed_out: false, status: 'green' }));
      return health.run()
        .then(function () {
          sinon.assert.calledOnce(plugin.status.yellow);
          expect(plugin.status.yellow.args[0][0]).to.be('Waiting for Elasticsearch');
          sinon.assert.calledOnce(plugin.status.red);
          /* jscs:disable maximumLineLength */
          expect(plugin.status.red.args[0][0]).to.be('Unable to connect to Elasticsearch at http://localhost:9200. Retrying in 2.5 seconds.');
          /* jscs:enable maximumLineLength */
          sinon.assert.calledTwice(client.ping);
          sinon.assert.calledOnce(client.nodes.info);
          sinon.assert.calledOnce(client.cluster.health);
          sinon.assert.calledOnce(plugin.status.green);
          expect(plugin.status.green.args[0][0]).to.be('Kibana index ready');
        });

    });

    it('should set the cluster red if the health check status is red, then to green', function () {
      this.timeout(3000);
      get.withArgs('elasticsearch.url').returns('http://localhost:9200');
      get.withArgs('elasticsearch.minimumVerison').returns('1.4.4');
      get.withArgs('kibana.index').returns('.my-kibana');
      client.ping.returns(Promise.resolve());
      client.cluster.health.onCall(0).returns(Promise.resolve({ timed_out: false, status: 'red' }));
      client.cluster.health.onCall(1).returns(Promise.resolve({ timed_out: false, status: 'green' }));
      return health.run()
        .then(function () {
          sinon.assert.calledOnce(plugin.status.yellow);
          expect(plugin.status.yellow.args[0][0]).to.be('Waiting for Elasticsearch');
          sinon.assert.calledOnce(plugin.status.red);
          /* jscs:disable maximumLineLength */
          expect(plugin.status.red.args[0][0]).to.be('Elasticsearch is still initializing the kibana index... Trying again in 2.5 second.');
          /* jscs:enable maximumLineLength */
          sinon.assert.calledOnce(client.ping);
          sinon.assert.calledOnce(client.nodes.info);
          sinon.assert.calledTwice(client.cluster.health);
          sinon.assert.calledOnce(plugin.status.green);
          expect(plugin.status.green.args[0][0]).to.be('Kibana index ready');
        });
    });

    it('should set the cluster yellow if the health check timed_out and create index', function () {
      this.timeout(3000);
      get.withArgs('elasticsearch.url').returns('http://localhost:9200');
      get.withArgs('elasticsearch.minimumVerison').returns('1.4.4');
      get.withArgs('kibana.index').returns('.my-kibana');
      client.ping.returns(Promise.resolve());
      client.cluster.health.onCall(0).returns(Promise.resolve({ timed_out: true, status: 'red' }));
      client.cluster.health.onCall(1).returns(Promise.resolve({ timed_out: false, status: 'green' }));
      client.indices.create.returns(Promise.resolve());
      return health.run()
        .then(function () {
          sinon.assert.calledTwice(plugin.status.yellow);
          expect(plugin.status.yellow.args[0][0]).to.be('Waiting for Elasticsearch');
          expect(plugin.status.yellow.args[1][0]).to.be('No existing Kibana index found');
          sinon.assert.calledOnce(client.ping);
          sinon.assert.calledOnce(client.indices.create);
          sinon.assert.calledOnce(client.nodes.info);
          sinon.assert.calledTwice(client.cluster.health);
        });
    });

  });
});
