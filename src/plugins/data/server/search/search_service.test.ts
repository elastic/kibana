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

import { coreMock } from '../../../../core/server/mocks';

import { SearchService } from './search_service';
import { CoreSetup } from '../../../../core/server';
import { DataPluginStart } from '../plugin';

describe('Search service', () => {
  let plugin: SearchService;
  let mockCoreSetup: MockedKeys<CoreSetup<object, DataPluginStart>>;

  beforeEach(() => {
    plugin = new SearchService(coreMock.createPluginInitializerContext({}));
    mockCoreSetup = coreMock.createSetup();
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      const setup = plugin.setup(mockCoreSetup);
      expect(setup).toHaveProperty('registerSearchStrategy');
    });
  });

  describe('start()', () => {
    it('exposes proper contract', async () => {
      const setup = plugin.start();
      expect(setup).toHaveProperty('getSearchStrategy');
    });
  });
});
