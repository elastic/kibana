import _ from 'lodash';
import Promise from 'bluebird';
import sinon from 'sinon';
import expect from 'expect.js';
import url from 'url';
import SetupError from '../setup_error';

import { esTestServerUrlParts } from '../../../../../test/es_test_server_url_parts';
import { ensureEsVersion } from '../ensure_es_version';

describe('plugins/elasticsearch', () => {
  describe('lib/ensure_es_version', () => {
    const KIBANA_VERSION = '5.1.0';

    let server;

    beforeEach(function () {
      server = {
        log: sinon.stub(),
        // This is required or else we get a SetupError.
        config: () => ({
          get: sinon.stub(),
        }),
        plugins: {
          elasticsearch: {
            getCluster: sinon.stub().withArgs('admin').returns({ callWithInternalUser: sinon.stub() }),
            status: {
              red: sinon.stub()
            },
            url: url.format(esTestServerUrlParts)
          }
        }
      };
    });

    function setNodes(/* ...versions */) {
      const versions = _.shuffle(arguments);
      const nodes = {};
      let i = 0;

      while (versions.length) {
        const name = 'node-' + (++i);
        const version = versions.shift();

        const node = {
          version: version,
          http: {
            publish_address: 'http_address',
          },
          ip: 'ip'
        };

        if (!_.isString(version)) _.assign(node, version);
        nodes[name] = node;
      }

      const cluster = server.plugins.elasticsearch.getCluster('admin');
      cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any).returns(Promise.resolve({ nodes: nodes }));
    }

    function setNodeWithoutHTTP(version) {
      const nodes = { 'node-without-http': { version, ip: 'ip' } };
      const cluster = server.plugins.elasticsearch.getCluster('admin');
      cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any).returns(Promise.resolve({ nodes: nodes }));
    }

    it('returns true with single a node that matches', async () => {
      setNodes('5.1.0');
      const result = await ensureEsVersion(server, KIBANA_VERSION);
      expect(result).to.be(true);
    });

    it('returns true with multiple nodes that satisfy', async () => {
      setNodes('5.1.0', '5.2.0', '5.1.1-Beta1');
      const result = await ensureEsVersion(server, KIBANA_VERSION);
      expect(result).to.be(true);
    });

    it('throws an error with a single node that is out of date', async () => {
      // 5.0.0 ES is too old to work with a 5.1.0 version of Kibana.
      setNodes('5.1.0', '5.2.0', '5.0.0');
      try {
        await ensureEsVersion(server, KIBANA_VERSION);
      } catch (e) {
        expect(e).to.be.a(SetupError);
      }
    });

    it('fails if that single node is a client node', async () => {
      setNodes(
        '5.1.0',
        '5.2.0',
        { version: '5.0.0', attributes: { client: 'true' } },
      );
      try {
        await ensureEsVersion(server, KIBANA_VERSION);
      } catch (e) {
        expect(e).to.be.a(SetupError);
      }
    });

    it('warns if a node is only off by a patch version', async () => {
      setNodes('5.1.1');
      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 2);
      expect(server.log.getCall(0).args[0]).to.contain('debug');
      expect(server.log.getCall(1).args[0]).to.contain('warning');
    });

    it('warns if a node is off by a patch version and without http publish address', async () => {
      setNodeWithoutHTTP('5.1.1');
      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 2);
      expect(server.log.getCall(0).args[0]).to.contain('debug');
      expect(server.log.getCall(1).args[0]).to.contain('warning');
    });

    it('errors if a node incompatible and without http publish address', async () => {
      setNodeWithoutHTTP('6.1.1');
      try {
        await ensureEsVersion(server, KIBANA_VERSION);
      } catch (e) {
        expect(e.message).to.contain('incompatible nodes');
        expect(e).to.be.a(Error);
      }
    });

    it('only warns once per node list', async () => {
      setNodes('5.1.1');

      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 2);
      expect(server.log.getCall(0).args[0]).to.contain('debug');
      expect(server.log.getCall(1).args[0]).to.contain('warning');

      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 3);
      expect(server.log.getCall(2).args[0]).to.contain('debug');
    });

    it('warns again if the node list changes', async () => {
      setNodes('5.1.1');

      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 2);
      expect(server.log.getCall(0).args[0]).to.contain('debug');
      expect(server.log.getCall(1).args[0]).to.contain('warning');

      setNodes('5.1.2');
      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 4);
      expect(server.log.getCall(2).args[0]).to.contain('debug');
      expect(server.log.getCall(3).args[0]).to.contain('warning');
    });
  });
});
