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
import { fetchKibanaMigrationOpts } from './fetch_kibana_migration_opts';

describe('fetchKibanaMigrationOpts', () => {
  test('fails if there are multiple root doc types', async () => {
    const { kbnServer } = mockKbnServer({
      mappings: {
        doc: {},
        spock: {},
      },
    });
    await expect(fetchKibanaMigrationOpts({ kbnServer })).rejects.toThrow(
      /Your Kibana index is out of date, reset it or use the X-Pack upgrade assistant/
    );
  });

  test('fails if the root doc type is not doc', async () => {
    const { kbnServer } = mockKbnServer({
      mappings: {
        spock: {},
      },
    });
    await expect(fetchKibanaMigrationOpts({ kbnServer })).rejects.toThrow(
      /Your Kibana index is out of date, reset it or use the X-Pack upgrade assistant/
    );
  });

  test('returns valid migration options', async () => {
    const { kbnServer, callCluster } = mockKbnServer({
      mappings: {
        doc: {
          properties: {},
        },
      },
    });
    const index = kbnServer.server.config().get('kibana.index');

    kbnServer.pluginSpecs = [
      {
        getId: () => 'aaa',
        getExportSpecs: () => ({
          mappings: { aaa: { type: 'text' } },
          migrations: { prop: { '3.2.3': (doc: any) => doc } },
        }),
      },
      {
        getId: () => 'bbb',
        getExportSpecs: () => ({
          mappings: { bbb: { type: 'keyword' } },
          migrations: { bbb: { '1.2.3': (doc: any) => doc } },
        }),
      },
    ];

    callCluster
      .withArgs('indices.exists', { index })
      .returns(Promise.resolve(true));
    const opts = await fetchKibanaMigrationOpts({ kbnServer });
    sinon.assert.calledOnce(
      kbnServer.server.plugins.elasticsearch.waitUntilReady
    );

    expect(opts.index).toEqual(index);
    expect(opts.callCluster).toEqual(callCluster);
    expect(opts.mappings).toEqual({
      aaa: { type: 'text' },
      bbb: { type: 'keyword' },
    });
    expect(typeof opts.migrations.prop['3.2.3']).toBe('function');
    expect(typeof opts.migrations.bbb['1.2.3']).toBe('function');
  });
});

function mockKbnServer({ mappings }: { mappings?: object } = {}) {
  const callCluster = sinon.stub();
  const kbnServer = {
    pluginSpecs: [] as any,
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
      plugins: {
        elasticsearch: {
          getCluster: () => ({
            callWithInternalUser: callCluster,
          }),
          waitUntilReady: sinon.spy(() => Promise.resolve()),
        },
      },
    },
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
