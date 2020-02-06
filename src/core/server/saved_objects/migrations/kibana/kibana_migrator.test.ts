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
import { KibanaMigratorOptions, KibanaMigrator } from './kibana_migrator';
import { loggingServiceMock } from '../../../logging/logging_service.mock';
import { SavedObjectsSchema } from '../../schema';

describe('KibanaMigrator', () => {
  describe('getActiveMappings', () => {
    it('returns full index mappings w/ core properties', () => {
      const options = mockOptions();
      options.savedObjectMappings = [
        {
          pluginId: 'aaa',
          properties: { amap: { type: 'text' } },
        },
        {
          pluginId: 'bbb',
          properties: { bmap: { type: 'text' } },
        },
      ];
      const mappings = new KibanaMigrator(options).getActiveMappings();
      expect(mappings).toMatchSnapshot();
    });

    it('Fails if duplicate mappings are defined', () => {
      const options = mockOptions();
      options.savedObjectMappings = [
        {
          pluginId: 'aaa',
          properties: { amap: { type: 'text' } },
        },
        {
          pluginId: 'bbb',
          properties: { amap: { type: 'long' } },
        },
      ];
      expect(() => new KibanaMigrator(options).getActiveMappings()).toThrow(
        /Plugin bbb is attempting to redefine mapping "amap"/
      );
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
        .filter(callClusterPath => callClusterPath === 'cat.templates');
      expect(callClusterCommands.length).toBe(1);
    });
  });
});

function mockOptions({ configValues }: { configValues?: any } = {}): KibanaMigratorOptions {
  const callCluster = jest.fn();
  return {
    logger: loggingServiceMock.create().get(),
    kibanaVersion: '8.2.3',
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
    savedObjectSchemas: new SavedObjectsSchema({
      testtype2: {
        isNamespaceAgnostic: false,
        indexPattern: 'other-index',
      },
    }),
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
    config: {
      get: (name: string) => {
        if (configValues && configValues[name]) {
          return configValues[name];
        } else {
          throw new Error(`Unexpected config ${name}`);
        }
      },
    } as KibanaMigratorOptions['config'],
    callCluster,
  };
}
