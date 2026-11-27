/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom, of } from 'rxjs';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import { handleWarnings } from '@kbn/search-response-warnings';
import type { MockedKeys } from '@kbn/utility-types-jest';
import { SearchInterceptor } from './search_interceptor';
import type { SearchServiceSetupDependencies } from './search_service';
import { SearchService } from './search_service';
import type { ISearchStart } from './types';

jest.mock('@kbn/search-response-warnings', () => ({
  ...jest.requireActual('@kbn/search-response-warnings'),
  handleWarnings: jest.fn(),
}));

describe('Search service', () => {
  let searchService: SearchService;
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let mockCoreStart: MockedKeys<CoreStart>;
  const initializerContext = coreMock.createPluginInitializerContext();
  jest.useFakeTimers();
  initializerContext.config.get = jest.fn().mockReturnValue({
    search: { aggs: { shardDelay: { enabled: false } }, sessions: { enabled: true } },
  });

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    searchService = new SearchService(initializerContext);
    jest.advanceTimersByTime(30000);
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      const setup = searchService.setup(mockCoreSetup, {
        packageInfo: { version: '8' },
        expressions: { registerFunction: jest.fn(), registerType: jest.fn() },
      } as unknown as SearchServiceSetupDependencies);
      expect(setup).toHaveProperty('aggs');
      expect(setup).toHaveProperty('usageCollector');
      expect(setup).toHaveProperty('sessionsClient');
      expect(setup).toHaveProperty('session');
      expect(setup).toHaveProperty('ebtManager');
      expect(setup.sessionsConfig).toEqual({ enabled: true });
    });
  });

  describe('start()', () => {
    let data: ISearchStart;
    beforeEach(() => {
      searchService.setup(mockCoreSetup, {
        packageInfo: { version: '8' },
        expressions: { registerFunction: jest.fn(), registerType: jest.fn() },
      } as unknown as SearchServiceSetupDependencies);
      data = searchService.start(mockCoreStart, {
        fieldFormats: {} as FieldFormatsStart,
        dataViews: {} as DataViewsContract,
        inspector: {} as InspectorStartContract,
        screenshotMode: screenshotModePluginMock.createStartContract(),
        scriptedFieldsEnabled: true,
      });
    });

    it('exposes proper contract', async () => {
      expect(data).toHaveProperty('aggs');
      expect(data).toHaveProperty('search');
      expect(data).toHaveProperty('isBackgroundSearchEnabled');
      expect(data).toHaveProperty('showWarnings');
      expect(data).toHaveProperty('showError');
      expect(data).toHaveProperty('searchSource');
      expect(data).toHaveProperty('sessionsClient');
      expect(data).toHaveProperty('session');
    });

    it('passes cache metadata to the warning Inspector when no adapter is supplied', async () => {
      const rawResponse = { timed_out: true };
      const search = jest
        .spyOn(SearchInterceptor.prototype, 'search')
        .mockReturnValueOnce(of({ rawResponse, isCached: true }));

      try {
        await lastValueFrom(data.searchSource.createEmpty().fetch$());

        const [{ requestAdapter }] = jest.mocked(handleWarnings).mock.calls[0];
        const [request] = requestAdapter.getRequests();
        expect(request.response?.isCached).toBe(true);
        expect(request.response?.json).toStrictEqual({ rawResponse });
      } finally {
        search.mockRestore();
      }
    });
  });
});
