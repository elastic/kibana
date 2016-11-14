import _ from 'lodash';
import Promise from 'bluebird';
import sinon from 'sinon';
import expect from 'expect.js';
import url from 'url';

import serverConfig from '../../../../../test/server_config';
import checkEsVersion from '../check_es_version';

describe('plugins/elasticsearch', () => {
  describe('lib/check_es_version', () => {
    const KIBANA_VERSION = '5.1.0';

    let server;
    let plugin;

    beforeEach(function () {
      server = {
        log: sinon.stub(),
        plugins: {
          elasticsearch: {
            client: {
              nodes: {}
            },
            status: {
              red: sinon.stub()
            },
            url: url.format(serverConfig.servers.elasticsearch)
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

      const client = server.plugins.elasticsearch.adminClient;
      client.nodes.info = sinon.stub().returns(Promise.resolve({ nodes: nodes }));
    }

    it('returns true with single a node that matches', async () => {
      setNodes('5.1.0');
      const result = await checkEsVersion(server, KIBANA_VERSION);
      expect(result).to.be(true);
    });

    it('returns true with multiple nodes that satisfy', async () => {
      setNodes('5.1.0', '5.2.0', '5.1.1-Beta1');
      const result = await checkEsVersion(server, KIBANA_VERSION);
      expect(result).to.be(true);
    });

    it('throws an error with a single node that is out of date', async () => {
      // 5.0.0 ES is too old to work with a 5.1.0 version of Kibana.
      setNodes('5.1.0', '5.2.0', '5.0.0');
      try {
        await checkEsVersion(server, KIBANA_VERSION);
      } catch (e) {
        expect(e).to.be.a(Error);
      }
    });

    it('fails if that single node is a client node', async () => {
      setNodes(
        '5.1.0',
        '5.2.0',
        { version: '5.0.0', attributes: { client: 'true' } },
      );
      try {
        await checkEsVersion(server, KIBANA_VERSION);
      } catch (e) {
        expect(e).to.be.a(Error);
      }
    });

    it('warns if a node is only off by a patch version', async () => {
      setNodes('5.1.1');
      await checkEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 2);
      expect(server.log.getCall(0).args[0]).to.contain('debug');
      expect(server.log.getCall(1).args[0]).to.contain('warning');
    });

    it('only warns once per node list', async () => {
      setNodes('5.1.1');

      await checkEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 2);
      expect(server.log.getCall(0).args[0]).to.contain('debug');
      expect(server.log.getCall(1).args[0]).to.contain('warning');

      await checkEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 3);
      expect(server.log.getCall(2).args[0]).to.contain('debug');
    });

    it('warns again if the node list changes', async () => {
      setNodes('5.1.1');

      await checkEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 2);
      expect(server.log.getCall(0).args[0]).to.contain('debug');
      expect(server.log.getCall(1).args[0]).to.contain('warning');

      setNodes('5.1.2');
      await checkEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.log, 4);
      expect(server.log.getCall(2).args[0]).to.contain('debug');
      expect(server.log.getCall(3).args[0]).to.contain('warning');
    });
  });
});
