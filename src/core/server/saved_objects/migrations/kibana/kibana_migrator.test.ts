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
import { take } from 'rxjs/operators';

import { KibanaMigratorOptions, KibanaMigrator } from './kibana_migrator';
import { loggingSystemMock } from '../../../logging/logging_system.mock';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectsType } from '../../types';

const createRegistry = (types: Array<Partial<SavedObjectsType>>) => {
  const registry = new SavedObjectTypeRegistry();
  types.forEach((type) =>
    registry.registerType({
      name: 'unknown',
      hidden: false,
      namespaceType: 'single',
      mappings: { properties: {} },
      migrations: {},
      ...type,
    })
  );
  return registry;
};

describe('KibanaMigrator', () => {
  describe('getActiveMappings', () => {
    it('returns full index mappings w/ core properties', () => {
      const options = mockOptions();
      options.typeRegistry = createRegistry([
        {
          name: 'amap',
          mappings: {
            properties: { field: { type: 'text' } },
          },
        },
        {
          name: 'bmap',
          indexPattern: 'other-index',
          mappings: {
            properties: { field: { type: 'text' } },
          },
        },
      ]);

      const mappings = new KibanaMigrator(options).getActiveMappings();
      expect(mappings).toMatchSnapshot();
    });
  });

  describe('runMigrations', () => {
    it('only runs migrations once if called multiple times', async () => {
      const options = mockOptions();
      const clusterStub = jest.fn<any, any>(() => ({ status: 404 }));

      options.callCluster = clusterStub;
      const migrator = new KibanaMigrator(options);
      await migrator.runMigrations();
      await migrator.runMigrations();

      // callCluster with "cat.templates" is called by "deleteIndexTemplates" function
      // and should only be done once
      const callClusterCommands = clusterStub.mock.calls
        .map(([callClusterPath]) => callClusterPath)
        .filter((callClusterPath) => callClusterPath === 'cat.templates');
      expect(callClusterCommands.length).toBe(1);
    });

    it('emits results on getMigratorResult$()', async () => {
      const options = mockOptions();
      const clusterStub = jest.fn<any, any>(() => ({ status: 404 }));

      options.callCluster = clusterStub;
      const migrator = new KibanaMigrator(options);
      const migratorStatus = migrator.getStatus$().pipe(take(3)).toPromise();
      await migrator.runMigrations();
      const { status, result } = await migratorStatus;
      expect(status).toEqual('completed');
      expect(result![0]).toMatchObject({
        destIndex: '.my-index_1',
        elapsedMs: expect.any(Number),
        sourceIndex: '.my-index',
        status: 'migrated',
      });
      expect(result![1]).toMatchObject({
        destIndex: 'other-index_1',
        elapsedMs: expect.any(Number),
        sourceIndex: 'other-index',
        status: 'migrated',
      });
    });
  });
});

function mockOptions(): KibanaMigratorOptions {
  const callCluster = jest.fn();
  return {
    logger: loggingSystemMock.create().get(),
    kibanaVersion: '8.2.3',
    savedObjectValidations: {},
    typeRegistry: createRegistry([
      {
        name: 'testtype',
        hidden: false,
        namespaceType: 'single',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: {},
      },
      {
        name: 'testtype2',
        hidden: false,
        namespaceType: 'single',
        indexPattern: 'other-index',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: {},
      },
    ]),
    kibanaConfig: {
      enabled: true,
      index: '.my-index',
    } as KibanaMigratorOptions['kibanaConfig'],
    savedObjectsConfig: {
      batchSize: 20,
      pollInterval: 20000,
      scrollDuration: '10m',
      skip: false,
    },
    callCluster,
  };
}
