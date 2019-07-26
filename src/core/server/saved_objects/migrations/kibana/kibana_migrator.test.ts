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
      expect(result).toEqual([{ status: 'skipped' }, { status: 'skipped' }]);
    });

    it('waits for kbnServer.ready and elasticsearch.ready before attempting migrations', async () => {
      const { kbnServer } = mockKbnServer();
      const clusterStub = jest.fn<any, any>(() => ({ status: 404 }));
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

      const migrationResults = await new KibanaMigrator({ kbnServer }).awaitMigration();
      expect(migrationResults.length).toEqual(2);
    });

    it('only handles and deletes index templates once', async () => {
      const { kbnServer } = mockKbnServer();
      const clusterStub = jest.fn<any, any>(() => ({ status: 404 }));
      const waitUntilReady = jest.fn(async () => undefined);

      kbnServer.server.plugins.elasticsearch = {
        waitUntilReady,
        getCluster() {
          return {
            callWithInternalUser: clusterStub,
          };
        },
      };

      await new KibanaMigrator({ kbnServer }).awaitMigration();

      // callCluster with "cat.templates" is called by "deleteIndexTemplates" function
      // and should only be done once
      const callClusterCommands = clusterStub.mock.calls
        .map(([callClusterPath]) => callClusterPath)
        .filter(callClusterPath => callClusterPath === 'cat.templates');
      expect(callClusterCommands.length).toBe(1);
    });
  });
});

function mockKbnServer({ configValues }: { configValues?: any } = {}) {
  const callCluster = jest.fn();
  const kbnServer: KbnServer = {
    version: '8.2.3',
    ready: jest.fn(async () => undefined),
    uiExports: {
      savedObjectsManagement: {},
      savedObjectValidations: {},
      savedObjectMigrations: {},
      savedObjectMappings: [
        {
          pluginId: 'testtype',
          properties: {
            testtype: {
              properties: {
                name: { type: 'keyword' },
              },
            },
          },
        },
        {
          pluginId: 'testtype2',
          properties: {
            testtype2: {
              properties: {
                name: { type: 'keyword' },
              },
            },
          },
        },
      ],
      savedObjectSchemas: {
        testtype2: {
          isNamespaceAgnostic: false,
          indexPattern: 'other-index',
        },
      },
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
