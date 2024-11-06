/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { bfetchPluginMock } from '@kbn/bfetch-plugin/public/mocks';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import type { MockedKeys } from '@kbn/utility-types-jest';
import { SearchService, SearchServiceSetupDependencies } from './search_service';
import { ISearchStart } from './types';

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
      const bfetch = bfetchPluginMock.createSetupContract();
      const setup = searchService.setup(mockCoreSetup, {
        packageInfo: { version: '8' },
        bfetch,
        expressions: { registerFunction: jest.fn(), registerType: jest.fn() },
        management: managementPluginMock.createSetupContract(),
      } as unknown as SearchServiceSetupDependencies);
      expect(setup).toHaveProperty('aggs');
      expect(setup).toHaveProperty('usageCollector');
      expect(setup).toHaveProperty('sessionsClient');
      expect(setup).toHaveProperty('session');
    });
  });

  describe('start()', () => {
    let data: ISearchStart;
    beforeEach(() => {
      const bfetch = bfetchPluginMock.createSetupContract();
      searchService.setup(mockCoreSetup, {
        packageInfo: { version: '8' },
        bfetch,
        expressions: { registerFunction: jest.fn(), registerType: jest.fn() },
        management: managementPluginMock.createSetupContract(),
      } as unknown as SearchServiceSetupDependencies);
      data = searchService.start(mockCoreStart, {
        fieldFormats: {} as FieldFormatsStart,
        indexPatterns: {} as DataViewsContract,
        inspector: {} as InspectorStartContract,
        screenshotMode: screenshotModePluginMock.createStartContract(),
        scriptedFieldsEnabled: true,
      });
    });

    it('exposes proper contract', async () => {
      expect(data).toHaveProperty('aggs');
      expect(data).toHaveProperty('search');
      expect(data).toHaveProperty('showError');
      expect(data).toHaveProperty('searchSource');
      expect(data).toHaveProperty('sessionsClient');
      expect(data).toHaveProperty('session');
    });
  });
});
