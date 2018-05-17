import Promise from 'bluebird';
import sinon from 'sinon';
import expect from 'expect.js';

const NoConnections = require('elasticsearch').errors.NoConnections;

import mappings from './fixtures/mappings';
import healthCheck from '../health_check';
import kibanaVersion from '../kibana_version';
import { esTestConfig } from '@kbn/test';
import * as patchKibanaIndexNS from '../patch_kibana_index';

const esPort = esTestConfig.getPort();
const esUrl = esTestConfig.getUrl();

describe('plugins/elasticsearch', () => {
  describe('lib/health_check', function () {
    this.timeout(3000);

    let health;
    let plugin;
    let cluster;
    let server;
    const sandbox = sinon.sandbox.create();

    function getTimerCount() {
      return Object.keys(sandbox.clock.timers || {}).length;
    }

    beforeEach(() => {
      const COMPATIBLE_VERSION_NUMBER = '5.0.0';

      // Stub the Kibana version instead of drawing from package.json.
      sandbox.stub(kibanaVersion, 'get').returns(COMPATIBLE_VERSION_NUMBER);
      sandbox.stub(patchKibanaIndexNS, 'patchKibanaIndex');

      // setup the plugin stub
      plugin = {
        name: 'elasticsearch',
        status: {
          red: sinon.stub(),
          green: sinon.stub(),
          yellow: sinon.stub(),
        }
      };

      cluster = { callWithInternalUser: sinon.stub() };
      cluster.callWithInternalUser.withArgs('index', sinon.match.any).returns(Promise.resolve());
      cluster.callWithInternalUser.withArgs('create', sinon.match.any).returns(Promise.resolve({ _id: '1', _version: 1 }));
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

      // setup the config().get()/.set() stubs
      const get = sinon.stub();
      get.withArgs('elasticsearch.url').returns(esUrl);
      get.withArgs('kibana.index').returns('.my-kibana');
      get.withArgs('pkg.version').returns('1.0.0');

      const set = sinon.stub();

      // Setup the server mock
      server = {
        log: sinon.stub(),
        info: { port: 5601 },
        config: function () { return { get, set }; },
        plugins: {
          elasticsearch: {
            getCluster: sinon.stub().returns(cluster)
          }
        },
        getKibanaIndexMappingsDsl() {
          return mappings;
        },
        ext: sinon.stub()
      };

      health = healthCheck(plugin, server);
    });

    afterEach(() => sandbox.restore());

    it('should stop when cluster is shutdown', () => {
      sandbox.useFakeTimers();

      // ensure that health.start() is responsible for the timer we are observing
      expect(getTimerCount()).to.be(0);
      health.start();
      expect(getTimerCount()).to.be(1);

      // ensure that a server extension was registered
      sinon.assert.calledOnce(server.ext);
      sinon.assert.calledWithExactly(server.ext, sinon.match.string, sinon.match.func);

      // call the server extension
      const reply = sinon.stub();
      const [, handler] = server.ext.firstCall.args;
      handler({}, reply);

      // ensure that the handler called reply and unregistered the time
      sinon.assert.calledOnce(reply);
      expect(getTimerCount()).to.be(0);
    });

    it('should set the cluster green if everything is ready', function () {
      cluster.callWithInternalUser.withArgs('ping').returns(Promise.resolve());

      return health.run()
        .then(function () {
          sinon.assert.calledOnce(plugin.status.yellow);
          sinon.assert.calledWithExactly(plugin.status.yellow, 'Waiting for Elasticsearch');

          sinon.assert.calledOnce(cluster.callWithInternalUser.withArgs('ping'));
          sinon.assert.calledTwice(cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any));
          sinon.assert.notCalled(plugin.status.red);
          sinon.assert.calledOnce(plugin.status.green);
          sinon.assert.calledWithExactly(plugin.status.green, 'Ready');
        });
    });

    it('should set the cluster red if the ping fails, then to green', function () {
      const ping = cluster.callWithInternalUser.withArgs('ping');
      ping.onCall(0).returns(Promise.reject(new NoConnections()));
      ping.onCall(1).returns(Promise.resolve());

      return health.run()
        .then(function () {
          sinon.assert.calledOnce(plugin.status.yellow);
          sinon.assert.calledWithExactly(plugin.status.yellow, 'Waiting for Elasticsearch');

          sinon.assert.calledOnce(plugin.status.red);
          sinon.assert.calledWithExactly(
            plugin.status.red,
            `Unable to connect to Elasticsearch at ${esUrl}.`
          );

          sinon.assert.calledTwice(ping);
          sinon.assert.calledTwice(cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any));
          sinon.assert.calledOnce(plugin.status.green);
          sinon.assert.calledWithExactly(plugin.status.green, 'Ready');
        });
    });

    describe('#waitUntilReady', function () {
      it('waits for green status', function () {
        plugin.status.once = sinon.spy(function (event, handler) {
          expect(event).to.be('green');
          setImmediate(handler);
        });

        return health.waitUntilReady().then(function () {
          sinon.assert.calledOnce(plugin.status.once);
        });
      });
    });
  });
});
