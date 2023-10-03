/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { bfetchPluginMock } from '@kbn/bfetch-plugin/public/mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { Start as InspectorStartContract, RequestAdapter } from '@kbn/inspector-plugin/public';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import type { MockedKeys } from '@kbn/utility-types-jest';
import { IInspectorInfo } from '../../common/search/search_source';
import { setNotifications } from '../services';
import { SearchService, SearchServiceSetupDependencies } from './search_service';
import { ISearchStart, WarningHandlerCallback } from './types';

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

    describe('showWarnings', () => {
      const notifications = notificationServiceMock.createStartContract();
      const hits = { total: 0, max_score: null, hits: [] };
      let failures: estypes.ShardFailure[] = [];
      let shards: estypes.ShardStatistics;
      let inspector: Required<IInspectorInfo>;
      let callback: WarningHandlerCallback;

      const getMockInspector = (base: Partial<IInspectorInfo>): Required<IInspectorInfo> =>
        ({
          title: 'test inspector',
          id: 'test-inspector-123',
          description: '',
          ...base,
        } as Required<IInspectorInfo>);

      const getMockResponseWithShards = (mockShards: estypes.ShardStatistics) => ({
        json: {
          rawResponse: { took: 25, timed_out: false, _shards: mockShards, hits, aggregations: {} },
        },
      });

      beforeEach(() => {
        setNotifications(notifications);
        notifications.toasts.addWarning.mockClear();
        failures = [
          {
            shard: 0,
            index: 'sample-01-rollup',
            node: 'VFTFJxpHSdaoiGxJFLSExQ',
            reason: {
              type: 'illegal_argument_exception',
              reason:
                'Field [kubernetes.container.memory.available.bytes] of type' +
                ' [aggregate_metric_double] is not supported for aggregation [percentiles]',
            },
          },
        ];
        shards = { total: 4, successful: 2, skipped: 0, failed: 2, failures };
        const adapter = new RequestAdapter();
        inspector = getMockInspector({ adapter });
        callback = jest.fn(() => false);
      });

      it('can show no notifications', () => {
        const responder = inspector.adapter.start('request1');
        shards = { total: 4, successful: 4, skipped: 0, failed: 0 };
        responder.ok(getMockResponseWithShards(shards));
        data.showWarnings(inspector.adapter, callback);

        expect(notifications.toasts.addWarning).toBeCalledTimes(0);
      });

      it('can show notifications if no callback is provided', () => {
        const responder = inspector.adapter.start('request1');
        responder.ok(getMockResponseWithShards(shards));
        data.showWarnings(inspector.adapter);

        expect(notifications.toasts.addWarning).toBeCalledTimes(1);
        expect(notifications.toasts.addWarning).toBeCalledWith({
          title: 'The data might be incomplete or wrong.',
          text: expect.any(Function),
        });
      });

      it("won't show notifications when all warnings are filtered out", () => {
        callback = () => true;
        const responder = inspector.adapter.start('request1');
        responder.ok(getMockResponseWithShards(shards));
        data.showWarnings(inspector.adapter, callback);

        expect(notifications.toasts.addWarning).toBeCalledTimes(0);
      });
    });
  });
});
