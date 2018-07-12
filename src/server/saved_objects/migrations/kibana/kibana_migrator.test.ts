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
import sinon from 'sinon';
import { KbnServer, KibanaMigrator } from './kibana_migrator';

describe('KibanaMigrator', () => {
  describe('migratorOptsFromKbnServer', () => {
    it('returns full index mappings w/ core properties', () => {
      const { kbnServer } = mockKbnServer();
      kbnServer.pluginSpecs = [
        {
          getId: () => 'aaa',
          getExportSpecs: () => ({ mappings: { amap: { type: 'text' } } }),
        },
        {
          getId: () => 'bbb',
          getExportSpecs: () => ({ mappings: { bmap: { type: 'text' } } }),
        },
      ];
      const mappings = new KibanaMigrator({ kbnServer }).getActiveMappings();
      expect(mappings).toMatchSnapshot();
    });

    it('Fails if duplicate mappings are defined', () => {
      const { kbnServer } = mockKbnServer();
      kbnServer.pluginSpecs = [
        {
          getId: () => 'aaa',
          getExportSpecs: () => ({ mappings: { amap: { type: 'text' } } }),
        },
        {
          getId: () => 'bbb',
          getExportSpecs: () => ({ mappings: { amap: { type: 'long' } } }),
        },
      ];
      expect(() =>
        new KibanaMigrator({ kbnServer }).getActiveMappings()
      ).toThrow(/Plugin bbb is attempting to redefine mappings "amap"/);
    });

    it('exposes callCluster as a function that waits for elasticsearch before running', async () => {
      const { kbnServer } = mockKbnServer();
      const clusterStub = sinon.stub();

      clusterStub.throws(new Error('Doh!'));

      let count = 0;
      kbnServer.server.plugins.elasticsearch = {
        getCluster() {
          expect(count).toEqual(1);
          return {
            callWithInternalUser: clusterStub,
          };
        },
        waitUntilReady() {
          return Promise.resolve().then(() => ++count);
        },
      };
      await expect(
        new KibanaMigrator({ kbnServer }).migrateIndex()
      ).rejects.toThrow(/Doh!/);
      expect(count).toEqual(1);
    });

    it('Fails if duplicate migrations are defined', () => {
      const { kbnServer } = mockKbnServer();
      kbnServer.pluginSpecs = [
        {
          getId: () => 'aaa',
          getExportSpecs: () => ({
            migrations: { foo: { '1.2.3': _.identity } },
          }),
        },
        {
          getId: () => 'bbb',
          getExportSpecs: () => ({
            migrations: { foo: { '1.2.3': _.identity } },
          }),
        },
      ];
      expect(() => new KibanaMigrator({ kbnServer })).toThrow(
        /Plugin bbb is attempting to redefine migrations "foo"/
      );
    });
  });
});

function mockKbnServer({ configValues }: { configValues?: any } = {}) {
  const callCluster = sinon.stub();
  const kbnServer: KbnServer = {
    version: '8.2.3',
    pluginSpecs: [] as any,
    server: {
      config: () => ({
        get: ((name: string) => {
          if (configValues && configValues[name]) {
            return configValues[name];
          }
          switch (name) {
            case 'kibana.index':
              return '.my-index';
            case 'migrations.batchSize':
              return 20;
            case 'migrations.pollInterval':
              return 20000;
            case 'migrations.scrollDuration':
              return '10m';
            default:
              throw new Error(`Unexpected config ${name}`);
          }
        }) as any,
      }),
      log: _.noop as any,
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

  return { kbnServer, callCluster };
}
