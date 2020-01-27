/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import Bluebird from 'bluebird';
import sinon from 'sinon';
import expect from '@kbn/expect';

import { esTestConfig } from '@kbn/test';
import { ensureEsVersion } from '../ensure_es_version';

describe('plugins/elasticsearch', () => {
  describe('lib/ensure_es_version', () => {
    const KIBANA_VERSION = '5.1.0';

    let server;

    beforeEach(function() {
      server = {
        log: sinon.stub(),
        logWithMetadata: sinon.stub(),
        plugins: {
          elasticsearch: {
            getCluster: sinon
              .stub()
              .withArgs('admin')
              .returns({ callWithInternalUser: sinon.stub() }),
            status: {
              red: sinon.stub(),
            },
            url: esTestConfig.getUrl(),
          },
        },
        config() {
          return {
            get: sinon.stub(),
          };
        },
      };
    });

    function setNodes(/* ...versions */) {
      const versions = _.shuffle(arguments);
      const nodes = {};
      let i = 0;

      while (versions.length) {
        const name = 'node-' + ++i;
        const version = versions.shift();

        const node = {
          version: version,
          http: {
            publish_address: 'http_address',
          },
          ip: 'ip',
        };

        if (!_.isString(version)) _.assign(node, version);
        nodes[name] = node;
      }

      const cluster = server.plugins.elasticsearch.getCluster('admin');
      cluster.callWithInternalUser
        .withArgs('nodes.info', sinon.match.any)
        .returns(Bluebird.resolve({ nodes: nodes }));
    }

    function setNodeWithoutHTTP(version) {
      const nodes = { 'node-without-http': { version, ip: 'ip' } };
      const cluster = server.plugins.elasticsearch.getCluster('admin');
      cluster.callWithInternalUser
        .withArgs('nodes.info', sinon.match.any)
        .returns(Bluebird.resolve({ nodes: nodes }));
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
        expect(e).to.be.a(Error);
      }
    });

    it('does not throw on outdated nodes, if `ignoreVersionMismatch` is enabled in development mode', async () => {
      // set config values
      server.config = () => ({
        get: name => {
          switch (name) {
            case 'env.dev':
              return true;
            default:
              throw new Error(`Unknown option "${name}"`);
          }
        },
      });

      // 5.0.0 ES is too old to work with a 5.1.0 version of Kibana.
      setNodes('5.1.0', '5.2.0', '5.0.0');

      const ignoreVersionMismatch = true;
      const result = await ensureEsVersion(server, KIBANA_VERSION, ignoreVersionMismatch);
      expect(result).to.be(true);
    });

    it('throws an error if `ignoreVersionMismatch` is enabled in production mode', async () => {
      // set config values
      server.config = () => ({
        get: name => {
          switch (name) {
            case 'env.dev':
              return false;
            default:
              throw new Error(`Unknown option "${name}"`);
          }
        },
      });

      // 5.0.0 ES is too old to work with a 5.1.0 version of Kibana.
      setNodes('5.1.0', '5.2.0', '5.0.0');

      try {
        const ignoreVersionMismatch = true;
        await ensureEsVersion(server, KIBANA_VERSION, ignoreVersionMismatch);
      } catch (e) {
        expect(e).to.be.a(Error);
      }
    });

    it('fails if that single node is a client node', async () => {
      setNodes('5.1.0', '5.2.0', { version: '5.0.0', attributes: { client: 'true' } });
      try {
        await ensureEsVersion(server, KIBANA_VERSION);
      } catch (e) {
        expect(e).to.be.a(Error);
      }
    });

    it('warns if a node is only off by a patch version', async () => {
      setNodes('5.1.1');
      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.logWithMetadata, 2);
      expect(server.logWithMetadata.getCall(0).args[0]).to.contain('debug');
      expect(server.logWithMetadata.getCall(1).args[0]).to.contain('warning');
    });

    it('warns if a node is off by a patch version and without http publish address', async () => {
      setNodeWithoutHTTP('5.1.1');
      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.logWithMetadata, 2);
      expect(server.logWithMetadata.getCall(0).args[0]).to.contain('debug');
      expect(server.logWithMetadata.getCall(1).args[0]).to.contain('warning');
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
      sinon.assert.callCount(server.logWithMetadata, 2);
      expect(server.logWithMetadata.getCall(0).args[0]).to.contain('debug');
      expect(server.logWithMetadata.getCall(1).args[0]).to.contain('warning');

      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.logWithMetadata, 3);
      expect(server.logWithMetadata.getCall(2).args[0]).to.contain('debug');
    });

    it('warns again if the node list changes', async () => {
      setNodes('5.1.1');

      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.logWithMetadata, 2);
      expect(server.logWithMetadata.getCall(0).args[0]).to.contain('debug');
      expect(server.logWithMetadata.getCall(1).args[0]).to.contain('warning');

      setNodes('5.1.2');
      await ensureEsVersion(server, KIBANA_VERSION);
      sinon.assert.callCount(server.logWithMetadata, 4);
      expect(server.logWithMetadata.getCall(2).args[0]).to.contain('debug');
      expect(server.logWithMetadata.getCall(3).args[0]).to.contain('warning');
    });
  });
});
