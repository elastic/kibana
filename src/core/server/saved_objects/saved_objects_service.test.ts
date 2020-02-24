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

jest.mock('./migrations/kibana/kibana_migrator');

import { SavedObjectsService, SavedObjectsSetupDeps } from './saved_objects_service';
import { mockCoreContext } from '../core_context.mock';
// @ts-ignore Typescript doesn't know about the jest mock
import { KibanaMigrator, mockKibanaMigratorInstance } from './migrations/kibana/kibana_migrator';
import * as legacyElasticsearch from 'elasticsearch';
import { Env } from '../config';
import { configServiceMock } from '../mocks';
import { elasticsearchServiceMock } from '../elasticsearch/elasticsearch_service.mock';
import { legacyServiceMock } from '../legacy/legacy_service.mock';
import { BehaviorSubject } from 'rxjs';
import { NodesVersionCompatibility } from '../elasticsearch/version_check/ensure_es_version';

describe('SavedObjectsService', () => {
  const createSetupDeps = () => {
    const elasticsearchMock = elasticsearchServiceMock.createInternalSetup();
    return {
      elasticsearch: elasticsearchMock,
      legacyPlugins: legacyServiceMock.createDiscoverPlugins(),
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#setup()', () => {
    it('creates a KibanaMigrator which retries NoConnections errors from callAsInternalUser', async () => {
      const coreContext = mockCoreContext.create();
      let i = 0;
      const clusterClient = {
        callAsInternalUser: jest
          .fn()
          .mockImplementation(() =>
            i++ <= 2
              ? Promise.reject(new legacyElasticsearch.errors.NoConnections())
              : Promise.resolve('success')
          ),
      };

      const soService = new SavedObjectsService(coreContext);
      const coreSetup = ({
        elasticsearch: { adminClient: clusterClient },
        legacyPlugins: { uiExports: { savedObjectMappings: [] }, pluginExtendedConfig: {} },
      } as unknown) as SavedObjectsSetupDeps;

      await soService.setup(coreSetup, 1);

      return expect((KibanaMigrator as jest.Mock).mock.calls[0][0].callCluster()).resolves.toMatch(
        'success'
      );
    });
  });

  describe('#start()', () => {
    it('skips KibanaMigrator migrations when --optimize=true', async () => {
      const coreContext = mockCoreContext.create({
        env: ({ cliArgs: { optimize: true }, packageInfo: { version: 'x.x.x' } } as unknown) as Env,
      });
      const soService = new SavedObjectsService(coreContext);
      const coreSetup = ({
        elasticsearch: { adminClient: { callAsInternalUser: jest.fn() } },
        legacyPlugins: { uiExports: {}, pluginExtendedConfig: {} },
      } as unknown) as SavedObjectsSetupDeps;

      await soService.setup(coreSetup);
      await soService.start({});
      expect(mockKibanaMigratorInstance.runMigrations).not.toHaveBeenCalled();
    });

    it('skips KibanaMigrator migrations when migrations.skip=true', async () => {
      const configService = configServiceMock.create({ atPath: { skip: true } });
      const coreContext = mockCoreContext.create({ configService });
      const soService = new SavedObjectsService(coreContext);
      const coreSetup = ({
        elasticsearch: { adminClient: { callAsInternalUser: jest.fn() } },
        legacyPlugins: { uiExports: {}, pluginExtendedConfig: {} },
      } as unknown) as SavedObjectsSetupDeps;

      await soService.setup(coreSetup);
      await soService.start({});
      expect(mockKibanaMigratorInstance.runMigrations).not.toHaveBeenCalled();
    });

    it('waits for all es nodes to be compatible before running migrations', async done => {
      expect.assertions(2);
      const configService = configServiceMock.create({ atPath: { skip: false } });
      const coreContext = mockCoreContext.create({ configService });
      const soService = new SavedObjectsService(coreContext);
      const setupDeps = createSetupDeps();
      // Create an new subject so that we can control when isCompatible=true
      // is emitted.
      setupDeps.elasticsearch.esNodesCompatibility$ = new BehaviorSubject({
        isCompatible: false,
        incompatibleNodes: [],
        warningNodes: [],
        kibanaVersion: '8.0.0',
      });
      await soService.setup(setupDeps);
      soService.start({});
      expect(mockKibanaMigratorInstance.runMigrations).toHaveBeenCalledTimes(0);
      ((setupDeps.elasticsearch.esNodesCompatibility$ as any) as BehaviorSubject<
        NodesVersionCompatibility
      >).next({
        isCompatible: true,
        incompatibleNodes: [],
        warningNodes: [],
        kibanaVersion: '8.0.0',
      });
      setImmediate(() => {
        expect(mockKibanaMigratorInstance.runMigrations).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('resolves with KibanaMigrator after waiting for migrations to complete', async () => {
      const configService = configServiceMock.create({ atPath: { skip: false } });
      const coreContext = mockCoreContext.create({ configService });
      const soService = new SavedObjectsService(coreContext);
      const coreSetup = createSetupDeps();

      await soService.setup(coreSetup);
      expect(mockKibanaMigratorInstance.runMigrations).toHaveBeenCalledTimes(0);

      const startContract = await soService.start({});
      expect(startContract.migrator).toBe(mockKibanaMigratorInstance);
      expect(mockKibanaMigratorInstance.runMigrations).toHaveBeenCalledTimes(1);
    });
  });
});
