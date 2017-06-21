import Promise from 'bluebird';
import sinon from 'sinon';
import expect from 'expect.js';
import url from 'url';

const NoConnections = require('elasticsearch').errors.NoConnections;

import mappings from './fixtures/mappings';
import healthCheck from '../health_check';
import kibanaVersion from '../kibana_version';
import { esTestServerUrlParts } from '../../../../../test/es_test_server_url_parts';
import * as determineEnabledScriptingLangsNS from '../determine_enabled_scripting_langs';
import { determineEnabledScriptingLangs } from '../determine_enabled_scripting_langs';

const esPort = esTestServerUrlParts.port;
const esUrl = url.format(esTestServerUrlParts);

describe('plugins/elasticsearch', () => {
  describe('lib/health_check', function () {
    this.timeout(3000);

    let health;
    let plugin;
    let cluster;
    let server;

    beforeEach(() => {
      const COMPATIBLE_VERSION_NUMBER = '5.0.0';

      // Stub the Kibana version instead of drawing from package.json.
      sinon.stub(kibanaVersion, 'get').returns(COMPATIBLE_VERSION_NUMBER);

      // setup the plugin stub
      plugin = {
        name: 'elasticsearch',
        status: {
          red: sinon.stub(),
          green: sinon.stub(),
          yellow: sinon.stub()
        }
      };

      cluster = { callWithInternalUser: sinon.stub() };
      cluster.callWithInternalUser.withArgs('index', sinon.match.any).returns(Promise.resolve());
      cluster.callWithInternalUser.withArgs('mget', sinon.match.any).returns(Promise.resolve({ ok: true }));
      cluster.callWithInternalUser.withArgs('get', sinon.match.any).returns(Promise.resolve({ found: false }));
      cluster.callWithInternalUser.withArgs('search', sinon.match.any).returns(Promise.resolve({ hits: { hits: [] } }));
      cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any).returns(Promise.resolve({
        nodes: {
          'node-01': {
            version: COMPATIBLE_VERSION_NUMBER,
            http_address: `inet[/127.0.0.1:${esPort}]`,
            ip: '127.0.0.1'
          }
        }
      }));

      sinon.stub(determineEnabledScriptingLangsNS, 'determineEnabledScriptingLangs').returns(Promise.resolve([]));

      // setup the config().get()/.set() stubs
      const get = sinon.stub();
      get.withArgs('elasticsearch.url').returns(esUrl);
      get.withArgs('kibana.index').returns('.my-kibana');

      const set = sinon.stub();

      // Setup the server mock
      server = {
        log: sinon.stub(),
        info: { port: 5601 },
        config: function () { return { get, set }; },
        expose: sinon.stub(),
        plugins: {
          elasticsearch: {
            getCluster: sinon.stub().returns(cluster)
          }
        }
      };

      health = healthCheck(plugin, server, { mappings });
    });

    afterEach(() => {
      kibanaVersion.get.restore();
      determineEnabledScriptingLangs.restore();
    });

    it('should set the cluster green if everything is ready', function () {
      cluster.callWithInternalUser.withArgs('ping').returns(Promise.resolve());
      cluster.callWithInternalUser.withArgs('cluster.health', sinon.match.any).returns(
        Promise.resolve({ timed_out: false, status: 'green' })
      );

      return health.run()
        .then(function () {
          sinon.assert.calledOnce(plugin.status.yellow);
          expect(plugin.status.yellow.args[0][0]).to.be('Waiting for Elasticsearch');

          sinon.assert.calledOnce(cluster.callWithInternalUser.withArgs('ping'));
          sinon.assert.calledTwice(cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any));
          sinon.assert.calledOnce(cluster.callWithInternalUser.withArgs('cluster.health', sinon.match.any));
          sinon.assert.calledOnce(plugin.status.green);

          expect(plugin.status.green.args[0][0]).to.be('Kibana index ready');
        });
    });

    it('should set the cluster red if the ping fails, then to green', function () {
      const ping = cluster.callWithInternalUser.withArgs('ping');
      ping.onCall(0).returns(Promise.reject(new NoConnections()));
      ping.onCall(1).returns(Promise.resolve());

      cluster.callWithInternalUser.withArgs('cluster.health', sinon.match.any).returns(
        Promise.resolve({ timed_out: false, status: 'green' })
      );

      return health.run()
        .then(function () {
          sinon.assert.calledOnce(plugin.status.yellow);
          expect(plugin.status.yellow.args[0][0]).to.be('Waiting for Elasticsearch');

          sinon.assert.calledOnce(plugin.status.red);
          expect(plugin.status.red.args[0][0]).to.be(
            `Unable to connect to Elasticsearch at ${esUrl}.`
          );

          sinon.assert.calledTwice(ping);
          sinon.assert.calledTwice(cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any));
          sinon.assert.calledOnce(cluster.callWithInternalUser.withArgs('cluster.health', sinon.match.any));
          sinon.assert.calledOnce(plugin.status.green);
          expect(plugin.status.green.args[0][0]).to.be('Kibana index ready');
        });
    });

    it('should set the cluster red if the health check status is red, then to green', function () {
      cluster.callWithInternalUser.withArgs('ping').returns(Promise.resolve());

      const clusterHealth = cluster.callWithInternalUser.withArgs('cluster.health', sinon.match.any);
      clusterHealth.onCall(0).returns(Promise.resolve({ timed_out: false, status: 'red' }));
      clusterHealth.onCall(1).returns(Promise.resolve({ timed_out: false, status: 'green' }));

      return health.run()
        .then(function () {
          sinon.assert.calledOnce(plugin.status.yellow);
          expect(plugin.status.yellow.args[0][0]).to.be('Waiting for Elasticsearch');
          sinon.assert.calledOnce(plugin.status.red);
          expect(plugin.status.red.args[0][0]).to.be(
            'Elasticsearch is still initializing the kibana index.'
          );
          sinon.assert.calledOnce(cluster.callWithInternalUser.withArgs('ping'));
          sinon.assert.calledTwice(cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any));
          sinon.assert.calledTwice(cluster.callWithInternalUser.withArgs('cluster.health', sinon.match.any));
          sinon.assert.calledOnce(plugin.status.green);
          expect(plugin.status.green.args[0][0]).to.be('Kibana index ready');
        });
    });

    it('should set the cluster yellow if the health check timed_out and create index', function () {
      cluster.callWithInternalUser.withArgs('ping').returns(Promise.resolve());

      const clusterHealth = cluster.callWithInternalUser.withArgs('cluster.health', sinon.match.any);
      clusterHealth.onCall(0).returns(Promise.resolve({ timed_out: true, status: 'red' }));
      clusterHealth.onCall(1).returns(Promise.resolve({ timed_out: false, status: 'green' }));

      cluster.callWithInternalUser.withArgs('indices.create', sinon.match.any).returns(Promise.resolve());

      return health.run()
        .then(function () {
          sinon.assert.calledTwice(plugin.status.yellow);
          expect(plugin.status.yellow.args[0][0]).to.be('Waiting for Elasticsearch');
          expect(plugin.status.yellow.args[1][0]).to.be('No existing Kibana index found');

          sinon.assert.calledOnce(cluster.callWithInternalUser.withArgs('ping'));
          sinon.assert.calledOnce(cluster.callWithInternalUser.withArgs('indices.create', sinon.match.any));
          sinon.assert.calledTwice(cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any));
          sinon.assert.calledTwice(clusterHealth);
        });
    });

    describe('latestHealthCheckResults', () => {
      it('exports an object when the health check completes', () => {
        cluster.callWithInternalUser.withArgs('ping').returns(Promise.resolve());
        cluster.callWithInternalUser.withArgs('cluster.health', sinon.match.any).returns(
          Promise.resolve({ timed_out: false, status: 'green' })
        );
        determineEnabledScriptingLangs.returns(Promise.resolve([
          'foo',
          'bar'
        ]));

        return health.run()
          .then(function () {
            sinon.assert.calledOnce(server.expose);
            expect(server.expose.firstCall.args).to.eql([
              'latestHealthCheckResults',
              {
                enabledScriptingLangs: [
                  'foo',
                  'bar'
                ]
              }
            ]);
          });
      });
    });

    describe('#waitUntilReady', function () {
      it('polls health until index is ready', function () {
        const clusterHealth = cluster.callWithInternalUser.withArgs('cluster.health', sinon.match.any);
        clusterHealth.onCall(0).returns(Promise.resolve({ timed_out: true }));
        clusterHealth.onCall(1).returns(Promise.resolve({ status: 'red' }));
        clusterHealth.onCall(2).returns(Promise.resolve({ status: 'green' }));

        return health.waitUntilReady().then(function () {
          sinon.assert.calledThrice(clusterHealth);
        });
      });
    });
  });
});
