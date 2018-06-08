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
import sinon from 'sinon';
import { initializeKibanaIndex, buildKibanaMappings } from './kibana_index_migrator';

describe('kibana_index_migrator', async () => {

  describe('buildKibanaMappings', () => {
    test('builds a mapping from those defined by plugins', () => {
      const pluginSpecs = [
        {
          getExportSpecs: () => ({ mappings: { aaa: { type: 'text' } } }),
          getId: () => 'pluginA',
        },
        {
          getExportSpecs: () => undefined,
          getId: () => 'pluginB',
        },
        {
          getExportSpecs: () => ({ mappings: { ccc: { type: 'keyword' } } }),
          getId: () => 'pluginC',
        },
      ];
      const kbnServer = {
        pluginSpecs,
        version: '8.2.4',
      };

      expect(buildKibanaMappings(kbnServer))
        .toMatchSnapshot();
    });
  });

  describe('initializeKibanaIndex', async () => {
    test('does nothing if elasticsearch plugin is disabled', async () => {
      const kbnServer = {
        server: {
          plugins: {},
          log: sinon.spy(),
        }
      };
      await initializeKibanaIndex(kbnServer);
      sinon.assert.calledOnce(kbnServer.server.log);
      sinon.assert.calledWithMatch(
        kbnServer.server.log,
        ['warn', 'migration'],
        'The elasticsearch plugin is unavailable'
      );
    });

    test('patches the index if elasticsearch is available', async () => {
      const cluster = { callWithInternalUser: sinon.stub() };
      cluster.callWithInternalUser.withArgs('indices.getMapping', sinon.match.any)
        .returns(Promise.resolve({
          '.my-kibana': {
            mappings: {
              doc: {
                dynamic: 'strict',
                properties: {
                  shazm: { type: 'text' },
                },
              },
            },
          },
        }));

      const get = sinon.stub();
      get.withArgs('kibana.index').returns('.my-kibana');

      const server = {
        log: sinon.stub(),
        config: function () { return { get }; },
        plugins: {
          elasticsearch: {
            getCluster: sinon.stub().returns(cluster),
            waitUntilReady: sinon.stub().returns(Promise.resolve()),
          }
        },
      };

      const kbnServer = {
        server,
        version: '9.8.7',
        pluginSpecs: [],
      };

      await initializeKibanaIndex(kbnServer);
      sinon.assert.calledOnce(kbnServer.server.plugins.elasticsearch.waitUntilReady);

      const expectedMappings = {
        doc: {
          dynamic: 'strict',
          _meta: { kibanaVersion: '9.8.7' },
          properties: {
            shazm: { type: 'text' },

            // A non-through sanity check that default mappings also get applied
            type: { type: 'keyword' },
          },
        },
      };

      sinon.assert.calledWithExactly(
        cluster.callWithInternalUser,
        'indices.putMapping',
        sinon.match({
          body: expectedMappings.doc,
          index: '.my-kibana',
          type: 'doc',
        })
      );
      sinon.assert.calledWithExactly(
        cluster.callWithInternalUser,
        'indices.putTemplate',
        sinon.match({
          body: {
            mappings: expectedMappings,
            settings: {
              auto_expand_replicas: '0-1',
              number_of_shards: 1,
            },
            template: '.my-kibana',
          },
          name: `kibana_index_template:.my-kibana`,
        }));

    });
  });
});
