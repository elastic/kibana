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

import { SavedObjectsService, SavedObjectsSetupDeps } from './saved_objects_service';
import { CoreContext } from '../core_context';
import { mockCoreContext } from '../core_context.mock';
import { KibanaMigrator } from './migrations/kibana/kibana_migrator';
import { of } from 'rxjs';
import elasticsearch from 'elasticsearch';

jest.mock('./migrations/kibana/kibana_migrator');

let coreContext: CoreContext;
beforeEach(() => {
  coreContext = mockCoreContext.create();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('SavedObjectsService', () => {
  describe('#setup()', () => {
    it('creates a KibanaMigrator which retries NoConnections errors from callAsInternalUser', async () => {
      let i = 0;
      const clusterClient = {
        callAsInternalUser: jest
          .fn()
          .mockImplementation(() =>
            i++ <= 2
              ? Promise.reject(new elasticsearch.errors.NoConnections())
              : Promise.resolve('success')
          ),
      };

      const soService = new SavedObjectsService(coreContext);
      const coreSetup = ({
        elasticsearch: { adminClient$: of(clusterClient) },
        legacy: { uiExports: {}, pluginExtendedConfig: {} },
      } as unknown) as SavedObjectsSetupDeps;

      await soService.setup(coreSetup);

      return expect((KibanaMigrator as jest.Mock).mock.calls[0][0].callCluster()).resolves.toMatch(
        'success'
      );
    });
  });

  describe('#start()', () => {
    it('resolves with KibanaMigrator after waiting for migrations to complete', async () => {
      const soService = new SavedObjectsService(coreContext);
      const coreSetup = ({
        elasticsearch: { adminClient$: of({ callAsInternalUser: jest.fn() }) },
        legacy: { uiExports: {}, pluginExtendedConfig: {} },
      } as unknown) as SavedObjectsSetupDeps;

      await soService.setup(coreSetup);
      const migrator = (KibanaMigrator as jest.Mock<KibanaMigrator>).mock.instances[0];
      expect(migrator.awaitMigration).toHaveBeenCalledTimes(0);
      await soService.start({}).then(result => {
        expect(result.migrator).toBeInstanceOf(KibanaMigrator);
      });
      expect(migrator.awaitMigration).toHaveBeenCalledTimes(1);
    });
  });
});
