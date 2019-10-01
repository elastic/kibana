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

import { SearchPublicPlugin } from './plugin';
import { CoreSetup } from '../../../core/public';
import { SYNC_SEARCH_STRATEGY } from './sync_search_strategy';
import { ISearchAppMountContext } from './i_search_app_mount_context';

describe('Search service', () => {
  let plugin: SearchPublicPlugin;
  let mockCoreSetup: MockedKeys<CoreSetup>;
  const opaqueId = Symbol();
  beforeEach(() => {
    plugin = new SearchPublicPlugin({ opaqueId });
    mockCoreSetup = coreMock.createSetup();
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      const setup = plugin.setup(mockCoreSetup);
      expect(setup).toHaveProperty('registerSearchStrategyContext');
      expect(setup).toHaveProperty('registerSearchStrategyProvider');
    });

    it('app mount', async () => {
      plugin.setup(mockCoreSetup);

      const mountContext = mockCoreSetup.application.registerMountContext.mock.calls[0][1]({
        core: mockCoreSetup,
      }) as ISearchAppMountContext;
      // console.log(
      //   'mockCoreSetup.application.registerMountContext.mock.calls[0][1]',
      //   mockCoreSetup.application.registerMountContext.mock.calls[0][1]()
      // );
      // console.log('mountContext', mountContext);

      await mountContext.search({}, {}, SYNC_SEARCH_STRATEGY);

      expect(mockCoreSetup.http.fetch.mock.calls[0]).toMatchInlineSnapshot(`undefined`);
    });
  });
});
