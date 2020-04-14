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

import { coreMock } from '../../../core/public/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { homePluginMock } from '../../home/public/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { managementPluginMock } from '../../management/public/mocks';
import { dataPluginMock } from '../../data/public/mocks';
import { SavedObjectsManagementPlugin } from './plugin';

describe('SavedObjectsManagementPlugin', () => {
  let plugin: SavedObjectsManagementPlugin;

  beforeEach(() => {
    plugin = new SavedObjectsManagementPlugin();
  });

  describe('#setup', () => {
    it('registers the saved_objects feature to the home plugin', async () => {
      const coreSetup = coreMock.createSetup({
        pluginStartDeps: { data: dataPluginMock.createStartContract() },
      });
      const homeSetup = homePluginMock.createSetupContract();
      const managementSetup = managementPluginMock.createSetupContract();

      await plugin.setup(coreSetup, { home: homeSetup, management: managementSetup });

      expect(homeSetup.featureCatalogue.register).toHaveBeenCalledTimes(1);
      expect(homeSetup.featureCatalogue.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'saved_objects',
        })
      );
    });
  });
});
