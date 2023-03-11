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
import { RequestAdapter } from '@kbn/inspector-plugin/public';
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
        screenshotMode: screenshotModePluginMock.createStartContract(),
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
          title: '2 of 4 shards failed',
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

      it('will show single notification when some warnings are filtered', () => {
        callback = (warning) => warning.reason?.type === 'illegal_argument_exception';
        shards.failures = [
          {
            reason: {
              type: 'illegal_argument_exception',
              reason: 'reason of "illegal_argument_exception"',
            },
          },
          {
            reason: {
              type: 'other_kind_of_exception',
              reason: 'reason of other_kind_of_exception',
            },
          },
          { reason: { type: 'fatal_warning', reason: 'this is a fatal warning message' } },
        ] as unknown as estypes.ShardFailure[];

        const responder = inspector.adapter.start('request1');
        responder.ok(getMockResponseWithShards(shards));
        data.showWarnings(inspector.adapter, callback);

        expect(notifications.toasts.addWarning).toBeCalledTimes(1);
        expect(notifications.toasts.addWarning).toBeCalledWith({
          title: '2 of 4 shards failed',
          text: expect.any(Function),
        });
      });

      it('can show a timed_out warning', () => {
        const responder = inspector.adapter.start('request1');
        shards = { total: 4, successful: 4, skipped: 0, failed: 0 };
        const response1 = getMockResponseWithShards(shards);
        response1.json.rawResponse.timed_out = true;
        responder.ok(response1);
        data.showWarnings(inspector.adapter, callback);

        expect(notifications.toasts.addWarning).toBeCalledTimes(1);
        expect(notifications.toasts.addWarning).toBeCalledWith({
          title: 'Data might be incomplete because your request timed out',
        });
      });

      it('can show two warnings if response has shard failures and also timed_out', () => {
        const responder = inspector.adapter.start('request1');
        const response1 = getMockResponseWithShards(shards);
        response1.json.rawResponse.timed_out = true;
        responder.ok(response1);
        data.showWarnings(inspector.adapter, callback);

        expect(notifications.toasts.addWarning).toBeCalledTimes(2);
        expect(notifications.toasts.addWarning).nthCalledWith(1, {
          title: 'Data might be incomplete because your request timed out',
        });
        expect(notifications.toasts.addWarning).nthCalledWith(2, {
          title: '2 of 4 shards failed',
          text: expect.any(Function),
        });
      });

      it('will show multiple warnings when multiple responses have shard failures', () => {
        const responder1 = inspector.adapter.start('request1');
        const responder2 = inspector.adapter.start('request2');
        responder1.ok(getMockResponseWithShards(shards));
        responder2.ok({
          json: {
            rawResponse: {
              timed_out: true,
            },
          },
        });

        data.showWarnings(inspector.adapter, callback);

        expect(notifications.toasts.addWarning).toBeCalledTimes(2);
        expect(notifications.toasts.addWarning).nthCalledWith(1, {
          title: '2 of 4 shards failed',
          text: expect.any(Function),
        });
        expect(notifications.toasts.addWarning).nthCalledWith(2, {
          title: 'Data might be incomplete because your request timed out',
        });
      });
    });
  });
});
