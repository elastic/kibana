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
import { KbnServer, KibanaMigrator } from './kibana_migrator';

describe('KibanaMigrator', () => {
  describe('getActiveMappings', () => {
    it('returns full index mappings w/ core properties', () => {
      const { kbnServer } = mockKbnServer();
      kbnServer.uiExports.savedObjectMappings = [
        {
          pluginId: 'aaa',
          properties: { amap: { type: 'text' } },
        },
        {
          pluginId: 'bbb',
          properties: { bmap: { type: 'text' } },
        },
      ];
      const mappings = new KibanaMigrator({ kbnServer }).getActiveMappings();
      expect(mappings).toMatchSnapshot();
    });

    it('Fails if duplicate mappings are defined', () => {
      const { kbnServer } = mockKbnServer();
      kbnServer.uiExports.savedObjectMappings = [
        {
          pluginId: 'aaa',
          properties: { amap: { type: 'text' } },
        },
        {
          pluginId: 'bbb',
          properties: { amap: { type: 'long' } },
        },
      ];
      expect(() => new KibanaMigrator({ kbnServer }).getActiveMappings()).toThrow(
        /Plugin bbb is attempting to redefine mapping "amap"/
      );
    });
  });

  describe('awaitMigration', () => {
    it('changes isMigrated to true if migrations were skipped', async () => {
      const { kbnServer } = mockKbnServer();
      kbnServer.server.plugins.elasticsearch = undefined;
      const result = await new KibanaMigrator({ kbnServer }).awaitMigration();
      expect(result).toEqual({ status: 'skipped' });
    });

    it('waits for kbnServer.ready and elasticsearch.ready before attempting migrations', async () => {
      const { kbnServer } = mockKbnServer();
      const clusterStub = jest.fn<any, any>(() => {
        throw new Error('Doh!');
      });
      const waitUntilReady = jest.fn(async () => undefined);

      kbnServer.server.plugins.elasticsearch = {
        waitUntilReady,
        getCluster() {
          expect(kbnServer.ready as any).toHaveBeenCalledTimes(1);
          expect(waitUntilReady).toHaveBeenCalledTimes(1);

          return {
            callWithInternalUser: clusterStub,
          };
        },
      };

      await expect(new KibanaMigrator({ kbnServer }).awaitMigration()).rejects.toThrow(/Doh!/);
    });
  });
});

function mockKbnServer({ configValues }: { configValues?: any } = {}) {
  const callCluster = jest.fn();
  const kbnServer: KbnServer = {
    version: '8.2.3',
    ready: jest.fn(async () => undefined),
    uiExports: {
      savedObjectValidations: {},
      savedObjectMigrations: {},
      savedObjectMappings: [],
      savedObjectSchemas: {},
      savedObjectsManagement: {},
    },
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
          waitUntilReady: async () => undefined,
        },
      },
    },
  };

  return { kbnServer, callCluster };
}
