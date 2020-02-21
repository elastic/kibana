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

import { RequestHandler } from 'kibana/server';
import { coreMock } from '../../../core/server/mocks';
import { plugin } from './';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { mockRouter } from '../../../core/server/http/router/router.mock';
import { ApplicationUsagePlugin } from './plugin';

class UsageCollection {
  public usageCollector: any;
  public makeUsageCollector = (opts: any) => opts;
  public registerCollector = (opts: any) => (this.usageCollector = opts);
}

describe('ApplicationUsagePlugin/server', () => {
  let applicationUsagePlugin: ApplicationUsagePlugin;
  beforeEach(() => {
    jest.useFakeTimers();
    applicationUsagePlugin = plugin(coreMock.createPluginInitializerContext());
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.resetAllMocks();
  });

  test('it registers the routes, ensures the index template but does not register the usage collector because it is not initialised', async () => {
    await applicationUsagePlugin.setup(coreMock.createSetup(), {});
  });

  test('it registers the routes, ensures the index template and registers the usage collector', async () => {
    const usageCollection = new UsageCollection() as any;
    await applicationUsagePlugin.setup(coreMock.createSetup(), { usageCollection });
    expect(usageCollection.usageCollector).not.toBeUndefined();
  });

  describe('fetchUsage', () => {
    const usageCollection = new UsageCollection() as any;

    beforeAll(async () => {
      await applicationUsagePlugin.setup(coreMock.createSetup(), { usageCollection });
    });

    test('it should not fail if no aggregations are returned', async () => {
      const esClient = jest.fn((method, options) => {
        expect(method).toBe('search');
        return {};
      });

      expect(usageCollection.usageCollector.isReady()).toBe(true);
      const usage = await usageCollection.usageCollector.fetch(esClient);
      expect(usage).toStrictEqual({});
    });

    test('it should match an aggregation of application statistics', async () => {
      const esClient = jest.fn((method, options) => {
        expect(method).toBe('search');
        return {
          aggregations: {
            appId: {
              buckets: [
                {
                  key: 'test-app',
                  perDay: {
                    buckets: {
                      total: { numberOfClicks: { value: 10 }, minutesOnScreen: { value: 20 } },
                      last30Days: { numberOfClicks: { value: 1 }, minutesOnScreen: { value: 2 } },
                      last90Days: { numberOfClicks: { value: 5 }, minutesOnScreen: { value: 10 } },
                    },
                  },
                },
                {
                  key: 'test-plugin',
                  perDay: {
                    buckets: {
                      total: { numberOfClicks: { value: 20 }, minutesOnScreen: { value: 40 } },
                      last30Days: { numberOfClicks: { value: 2 }, minutesOnScreen: { value: 4 } },
                      last90Days: { numberOfClicks: { value: 15 }, minutesOnScreen: { value: 20 } },
                    },
                  },
                },
              ],
            },
          },
        };
      });

      const usage = await usageCollection.usageCollector.fetch(esClient);
      expect(usage).toStrictEqual({
        'test-app': {
          clicks_total: 10,
          clicks_30_days: 1,
          clicks_90_days: 5,
          minutes_on_screen_total: 20,
          minutes_on_screen_30_days: 2,
          minutes_on_screen_90_days: 10,
        },
        'test-plugin': {
          clicks_total: 20,
          clicks_30_days: 2,
          clicks_90_days: 15,
          minutes_on_screen_total: 40,
          minutes_on_screen_30_days: 4,
          minutes_on_screen_90_days: 20,
        },
      });
    });

    test('Fetch the usage while adding the totals from the saved objects', async () => {
      const localUsageCollection = new UsageCollection() as any;

      const esClient = jest.fn((method, options) => {
        if (method !== 'search') {
          return {};
        }
        return {
          aggregations: {
            appId: {
              buckets: [
                {
                  key: 'test-app',
                  perDay: {
                    buckets: {
                      total: { numberOfClicks: { value: 10 }, minutesOnScreen: { value: 20 } },
                      last30Days: { numberOfClicks: { value: 1 }, minutesOnScreen: { value: 2 } },
                      last90Days: { numberOfClicks: { value: 5 }, minutesOnScreen: { value: 10 } },
                    },
                  },
                },
                {
                  key: 'test-plugin',
                  perDay: {
                    buckets: {
                      total: { numberOfClicks: { value: 20 }, minutesOnScreen: { value: 40 } },
                      last30Days: { numberOfClicks: { value: 2 }, minutesOnScreen: { value: 4 } },
                      last90Days: { numberOfClicks: { value: 15 }, minutesOnScreen: { value: 20 } },
                    },
                  },
                },
              ],
            },
          },
        };
      });

      const appPlugin = plugin(coreMock.createPluginInitializerContext());

      const coreSetup = coreMock.createSetup();
      (coreSetup.elasticsearch.adminClient.callAsInternalUser as any).mockImplementation(esClient);

      await appPlugin.setup(coreSetup, { usageCollection: localUsageCollection });

      const coreStart = coreMock.createStart();
      coreStart.savedObjects.createInternalRepository.mockImplementation(
        () =>
          ({
            find: (opts: any) => ({
              saved_objects: [
                {
                  attributes: { appId: 'total-test-app', minutesOnScreen: 90, numberOfClicks: 100 },
                },
                {
                  attributes: { appId: 'test-app', minutesOnScreen: 95, numberOfClicks: 105 },
                },
              ],
            }),
            bulkCreate: (opts: any) => {
              expect(opts).toStrictEqual([
                {
                  type: 'application_usage',
                  id: 'test-app',
                  attributes: { appId: 'test-app', minutesOnScreen: 115, numberOfClicks: 115 },
                },
                {
                  type: 'application_usage',
                  id: 'test-plugin',
                  attributes: { appId: 'test-plugin', minutesOnScreen: 40, numberOfClicks: 20 },
                },
              ]);
            },
          } as any)
      );

      await appPlugin.start(coreStart);

      const usage = await localUsageCollection.usageCollector.fetch(esClient);
      expect(usage).toStrictEqual({
        'total-test-app': {
          clicks_total: 100,
          clicks_30_days: 0,
          clicks_90_days: 0,
          minutes_on_screen_total: 90,
          minutes_on_screen_30_days: 0,
          minutes_on_screen_90_days: 0,
        },
        'test-app': {
          clicks_total: 115,
          clicks_30_days: 1,
          clicks_90_days: 5,
          minutes_on_screen_total: 115,
          minutes_on_screen_30_days: 2,
          minutes_on_screen_90_days: 10,
        },
        'test-plugin': {
          clicks_total: 20,
          clicks_30_days: 2,
          clicks_90_days: 15,
          minutes_on_screen_total: 40,
          minutes_on_screen_30_days: 4,
          minutes_on_screen_90_days: 20,
        },
      });

      jest.runTimersToTime(24 * 60 * 60 * 1000);
      appPlugin.stop();
    });
  });

  test('POST /api/application-usage handler', async () => {
    let routeHandler: RequestHandler;
    const appPlugin = plugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    coreSetup.http.createRouter.mockImplementation(() => {
      const router = mockRouter.create({});
      router.post.mockImplementation((options, handler) => (routeHandler = handler));
      return router;
    });
    await appPlugin.setup(coreSetup, {});

    expect(routeHandler!).not.toBeUndefined();
    const context = coreMock.createRequestHandlerContext();
    context.elasticsearch.dataClient.callAsInternalUser.mockImplementation(
      async (method, options) => {
        expect(method).toBe('bulk');
        expect(options).toHaveProperty('body');
        expect(options!.body).toBeInstanceOf(Array);
        const body = options!.body.map(({ timestamp, ...rest }: any) => rest);
        expect(body).toStrictEqual([
          { index: { _index: '.kibana-application-usage' } },
          { appId: 'test-app', numberOfClicks: 10, minutesOnScreen: 9 },
          { index: { _index: '.kibana-application-usage' } },
          { appId: 'test-plugin', numberOfClicks: 11, minutesOnScreen: 8 },
        ]);
      }
    );
    await routeHandler!(
      { core: context },
      {
        body: {
          usage: [
            { appId: 'test-app', numberOfClicks: 10, minutesOnScreen: 9 },
            { appId: 'test-plugin', numberOfClicks: 11, minutesOnScreen: 8 },
          ],
        },
      } as any,
      { ok: jest.fn() } as any
    );
  });

  // TODO: Add tests
});
