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
import { patchKibanaIndexMappings } from './patch_kibana_index_mappings';

describe('patchKibanaIndexMappings', () => {
  test('fails if there are multiple root doc types', async () => {
    const { kbnServer } = mockKbnServer({
      mappings: {
        doc: {},
        spock: {},
      },
    });
    await expect(patchKibanaIndexMappings(kbnServer)).rejects.toThrow(
      /Your Kibana index is out of date, reset it or use the X-Pack upgrade assistant/
    );
  });

  test('fails if the root doc type is not doc', async () => {
    const { kbnServer } = mockKbnServer({
      mappings: {
        spock: {},
      },
    });
    await expect(patchKibanaIndexMappings(kbnServer)).rejects.toThrow(
      /Your Kibana index is out of date, reset it or use the X-Pack upgrade assistant/
    );
  });

  test('patches existing v6 indices', async () => {
    const { kbnServer, callCluster } = mockKbnServer({
      mappings: {
        doc: {
          properties: {},
        },
      },
    });
    const index = kbnServer.server.config().get('kibana.index');

    callCluster
      .withArgs('indices.exists', { index })
      .returns(Promise.resolve(true));
    await patchKibanaIndexMappings(kbnServer);
    sinon.assert.calledOnce(
      kbnServer.server.plugins.elasticsearch.waitUntilReady
    );

    const expectedMappings = {
      dynamic: 'strict',
      properties: {
        config: {
          dynamic: 'true',
          properties: { buildNum: { type: 'keyword' } },
        },
        type: { type: 'keyword' },
        updated_at: { type: 'date' },
      },
    };

    sinon.assert.calledWith(
      callCluster,
      'indices.putMapping',
      sinon.match({
        body: expectedMappings,
        index: '.my-index',
        type: 'doc',
      })
    );
    sinon.assert.calledWith(
      callCluster,
      'indices.putTemplate',
      sinon.match({
        body: {
          mappings: {
            doc: expectedMappings,
          },
          settings: { auto_expand_replicas: '0-1', number_of_shards: 1 },
          template: '.my-index',
        },
        name: 'kibana_index_template:.my-index',
      })
    );
  });

  test('passes if there is no index', async () => {
    const { kbnServer } = mockKbnServer();
    await patchKibanaIndexMappings(kbnServer);
  });
});

function mockKbnServer({ mappings }: { mappings?: object } = {}) {
  const callCluster = sinon.stub();
  const kbnServer = {
    pluginSpecs: [],
    server: {
      config: () => ({
        get: (name: string) => {
          switch (name) {
            case 'kibana.index':
              return '.my-index';
            default:
              throw new Error(`Unexpected config ${name}`);
          }
        },
      }),
      log: sinon.spy(),
      plugins: {
        elasticsearch: {
          getCluster: () => ({
            callWithInternalUser: callCluster,
          }),
          waitUntilReady: sinon.spy(() => Promise.resolve()),
        },
      },
    },
    version: '7.8.9',
  };
  callCluster
    .withArgs('indices.getMapping', sinon.match.any)
    .returns(
      mappings
        ? Promise.resolve({ '.my-index': { mappings } })
        : Promise.reject({ status: 404 })
    );

  return { kbnServer, callCluster };
}
