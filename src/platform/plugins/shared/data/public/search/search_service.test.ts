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
import { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import type { MockedKeys } from '@kbn/utility-types-jest';
import { UI_SETTINGS } from '../../common';
import type { SearchServiceSetupDependencies } from './search_service';
import { SearchService } from './search_service';
import type { ISearchStart } from './types';

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

    describe('showWarnings with a cluster that has no index matching the pattern', () => {
      const createAdapterWithEmptyRemote = () => {
        const adapter = new RequestAdapter();
        const responder = adapter.start('My request', { id: 'request-1' });
        responder.json({});
        responder.ok({
          json: {
            rawResponse: {
              took: 5,
              timed_out: false,
              _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
              _clusters: {
                total: 2,
                successful: 1,
                skipped: 1,
                running: 0,
                partial: 0,
                failed: 0,
                details: {
                  remote_ok: {
                    status: 'successful',
                    indices: 'remote_ok:logs-myapp',
                    took: 3,
                    timed_out: false,
                    _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
                  },
                  remote_empty: {
                    status: 'skipped',
                    indices: 'remote_empty:logs-myapp',
                    took: 0,
                    timed_out: false,
                    _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
                  },
                },
              },
              hits: { hits: [] },
            },
          },
        });
        return adapter;
      };

      const mockIgnoreEmptyClustersSetting = (value: boolean) => {
        mockCoreStart.uiSettings.get.mockImplementation((key: string) =>
          key === UI_SETTINGS.SEARCH_IGNORE_EMPTY_CLUSTERS ? value : undefined
        );
      };

      it('shows a warning when the ignore empty clusters setting is off', () => {
        mockIgnoreEmptyClustersSetting(false);

        data.showWarnings(createAdapterWithEmptyRemote());

        expect(mockCoreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
      });

      it('does not show a warning when the ignore empty clusters setting is on', () => {
        mockIgnoreEmptyClustersSetting(true);

        data.showWarnings(createAdapterWithEmptyRemote());

        expect(mockCoreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();
      });
    });
  });
});
