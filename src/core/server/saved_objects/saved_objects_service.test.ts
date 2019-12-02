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
import { of } from 'rxjs';
import * as legacyElasticsearch from 'elasticsearch';
import { Env } from '../config';
import { configServiceMock } from '../mocks';

afterEach(() => {
  jest.clearAllMocks();
});

describe('SavedObjectsService', () => {
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
        elasticsearch: { adminClient$: of(clusterClient) },
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
        elasticsearch: { adminClient$: of({ callAsInternalUser: jest.fn() }) },
        legacyPlugins: { uiExports: {}, pluginExtendedConfig: {} },
      } as unknown) as SavedObjectsSetupDeps;

      await soService.setup(coreSetup);
      await soService.start({});
      expect(mockKibanaMigratorInstance.runMigrations).toHaveBeenCalledWith(true);
    });

    it('skips KibanaMigrator migrations when migrations.skip=true', async () => {
      const configService = configServiceMock.create({ atPath: { skip: true } });
      const coreContext = mockCoreContext.create({ configService });
      const soService = new SavedObjectsService(coreContext);
      const coreSetup = ({
        elasticsearch: { adminClient$: of({ callAsInternalUser: jest.fn() }) },
        legacyPlugins: { uiExports: {}, pluginExtendedConfig: {} },
      } as unknown) as SavedObjectsSetupDeps;

      await soService.setup(coreSetup);
      await soService.start({});
      expect(mockKibanaMigratorInstance.runMigrations).toHaveBeenCalledWith(true);
    });

    it('resolves with KibanaMigrator after waiting for migrations to complete', async () => {
      const configService = configServiceMock.create({ atPath: { skip: false } });
      const coreContext = mockCoreContext.create({ configService });
      const soService = new SavedObjectsService(coreContext);
      const coreSetup = ({
        elasticsearch: { adminClient$: of({ callAsInternalUser: jest.fn() }) },
        legacyPlugins: { uiExports: {}, pluginExtendedConfig: {} },
      } as unknown) as SavedObjectsSetupDeps;

      await soService.setup(coreSetup);
      expect(mockKibanaMigratorInstance.runMigrations).toHaveBeenCalledTimes(0);

      const startContract = await soService.start({});
      expect(startContract.migrator).toBe(mockKibanaMigratorInstance);
      expect(mockKibanaMigratorInstance.runMigrations).toHaveBeenCalledWith(false);
      expect(mockKibanaMigratorInstance.runMigrations).toHaveBeenCalledTimes(1);
    });
  });
});
