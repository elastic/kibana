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

import { CoreSetup, CoreStart } from '../../../../core/server';
import { coreMock } from '../../../../core/server/mocks';

import { DataPluginStart } from '../plugin';
import { createFieldFormatsStartMock } from '../field_formats/mocks';

import { SearchService, SearchServiceSetupDependencies } from './search_service';

describe('Search service', () => {
  let plugin: SearchService;
  let mockCoreSetup: MockedKeys<CoreSetup<object, DataPluginStart>>;
  let mockCoreStart: MockedKeys<CoreStart>;

  beforeEach(() => {
    const mockLogger: any = {
      debug: () => {},
    };
    plugin = new SearchService(coreMock.createPluginInitializerContext({}), mockLogger);
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      const setup = plugin.setup(mockCoreSetup, ({
        packageInfo: { version: '8' },
        registerFunction: jest.fn(),
      } as unknown) as SearchServiceSetupDependencies);
      expect(setup).toHaveProperty('aggs');
      expect(setup).toHaveProperty('registerSearchStrategy');
    });
  });

  describe('start()', () => {
    it('exposes proper contract', async () => {
      const start = plugin.start(mockCoreStart, {
        fieldFormats: createFieldFormatsStartMock(),
      });
      expect(start).toHaveProperty('aggs');
      expect(start).toHaveProperty('getSearchStrategy');
    });
  });
});
