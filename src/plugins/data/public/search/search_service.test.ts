/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { coreMock } from '@kbn/core/public/mocks';
import { CoreSetup, CoreStart } from '@kbn/core/public';

import { SearchService, SearchServiceSetupDependencies } from './search_service';
import { bfetchPluginMock } from '@kbn/bfetch-plugin/public/mocks';

describe('Search service', () => {
  let searchService: SearchService;
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let mockCoreStart: MockedKeys<CoreStart>;
  const initializerContext = coreMock.createPluginInitializerContext();
  initializerContext.config.get = jest.fn().mockReturnValue({
    search: { aggs: { shardDelay: { enabled: false } } },
  });

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    searchService = new SearchService(initializerContext);
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      const bfetch = bfetchPluginMock.createSetupContract();
      const setup = searchService.setup(mockCoreSetup, {
        packageInfo: { version: '8' },
        bfetch,
        expressions: { registerFunction: jest.fn(), registerType: jest.fn() },
      } as unknown as SearchServiceSetupDependencies);
      expect(setup).toHaveProperty('aggs');
      expect(setup).toHaveProperty('usageCollector');
      expect(setup).toHaveProperty('sessionsClient');
      expect(setup).toHaveProperty('session');
    });
  });

  describe('start()', () => {
    it('exposes proper contract', async () => {
      const start = searchService.start(mockCoreStart, {
        fieldFormats: {},
        indexPatterns: {},
      } as any);
      expect(start).toHaveProperty('aggs');
      expect(start).toHaveProperty('search');
      expect(start).toHaveProperty('searchSource');
      expect(start).toHaveProperty('sessionsClient');
      expect(start).toHaveProperty('session');
    });
  });
});
