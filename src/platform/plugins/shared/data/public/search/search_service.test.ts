/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import type { MockedKeys } from '@kbn/utility-types-jest';
import type { SearchServiceSetupDependencies } from './search_service';
import { SearchService } from './search_service';
import type { ISearchStart } from './types';
import type { SharePluginStart } from '@kbn/share-plugin/public';

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
      searchService.setup(mockCoreSetup, {
        packageInfo: { version: '8' },
        expressions: { registerFunction: jest.fn(), registerType: jest.fn() },
        management: managementPluginMock.createSetupContract(),
      } as unknown as SearchServiceSetupDependencies);
      data = searchService.start(mockCoreStart, {
        fieldFormats: {} as FieldFormatsStart,
        dataViews: {} as DataViewsContract,
        inspector: {} as InspectorStartContract,
        screenshotMode: screenshotModePluginMock.createStartContract(),
        scriptedFieldsEnabled: true,
        share: {} as SharePluginStart,
      });
    });

    it('exposes proper contract', async () => {
      expect(data).toHaveProperty('aggs');
      expect(data).toHaveProperty('search');
      expect(data).toHaveProperty('showSearchSessionsFlyout');
      expect(data).toHaveProperty('isBackgroundSearchEnabled');
      expect(data).toHaveProperty('showWarnings');
      expect(data).toHaveProperty('showError');
      expect(data).toHaveProperty('searchSource');
      expect(data).toHaveProperty('sessionsClient');
      expect(data).toHaveProperty('session');
    });
  });
});
