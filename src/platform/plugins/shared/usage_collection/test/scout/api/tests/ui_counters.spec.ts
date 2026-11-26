/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ReportManager, METRIC_TYPE } from '@kbn/analytics';
import type { UiCounterMetricType } from '@kbn/analytics';
import { apiTest, testData } from '../fixtures';

const USAGE_COUNTER_TYPE = 'usage-counter';
const UI_METRIC_TYPE = 'ui-metric';
const APP_NAME = 'myApp';
// Usage counters are buffered for 5s by default and then written without a refresh.
const COUNTER_STORED_TIMEOUT = 30_000;

interface UsageCounter {
  id: string;
  attributes: { domainId: string; counterName: string; counterType: string; count: number };
}

const createUiCounterEvent = (eventName: string, type: UiCounterMetricType, count = 1) => ({
  eventName,
  appName: APP_NAME,
  type,
  count,
});

const uniqueEventName = (): string => {
  const hrTime = process.hrtime();
  const nano = hrTime[0] * 1000000000 + hrTime[1];
  return `my_event_${nano}`;
};

const findCounters = async (kbnClient: KbnClient, eventName: string): Promise<UsageCounter[]> => {
  const { data } = await kbnClient.request<{ saved_objects: UsageCounter[] }>({
    method: 'GET',
    path: '/api/saved_objects/_find',
    query: {
      type: USAGE_COUNTER_TYPE,
      filter: `${USAGE_COUNTER_TYPE}.attributes.domainId: "${APP_NAME}" and ${USAGE_COUNTER_TYPE}.attributes.counterName: "${eventName}"`,
    },
  });
  return data.saved_objects;
};

const toTypeAndCount = (counters: UsageCounter[]) =>
  counters
    .map(({ attributes: { counterType, count } }) => ({ counterType, count }))
    .sort((a, b) => a.counterType.localeCompare(b.counterType));

apiTest.describe('UI counters API', { tag: ['@local-stateful-classic'] }, () => {
  let viewerApiCredentials: RoleApiCredentials;
  const reportedEventNames: string[] = [];

  apiTest.beforeAll(async ({ requestAuth }) => {
    viewerApiCredentials = await requestAuth.getApiKey('viewer');
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    // The report endpoint also writes a legacy `ui-metric` object per event.
    const objects = reportedEventNames.map((eventName) => ({
      type: UI_METRIC_TYPE,
      id: `${APP_NAME}:${eventName}`,
    }));
    for (const eventName of reportedEventNames) {
      for (const { id } of await findCounters(kbnClient, eventName)) {
        objects.push({ type: USAGE_COUNTER_TYPE, id });
      }
    }
    await kbnClient.savedObjects.bulkDelete({ objects });
  });

  apiTest(
    'stores ui counter events in usage counters saved objects',
    async ({ apiClient, kbnClient }) => {
      const eventName = uniqueEventName();
      reportedEventNames.push(eventName);
      const { report } = new ReportManager().assignReports([
        createUiCounterEvent(eventName, METRIC_TYPE.COUNT),
      ]);

      const response = await apiClient.post(testData.UI_COUNTERS_REPORT_PATH, {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...testData.INTERNAL_HEADERS },
        responseType: 'json',
        body: { report },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok' });

      await expect
        .poll(async () => toTypeAndCount(await findCounters(kbnClient, eventName)), {
          timeout: COUNTER_STORED_TIMEOUT,
          intervals: [1_000],
        })
        .toStrictEqual([{ counterType: METRIC_TYPE.COUNT, count: 1 }]);
    }
  );

  apiTest('supports multiple events', async ({ apiClient, kbnClient }) => {
    const firstEventName = uniqueEventName();
    const secondEventName = `${firstEventName}_2`;
    reportedEventNames.push(firstEventName, secondEventName);
    const { report } = new ReportManager().assignReports([
      createUiCounterEvent(firstEventName, METRIC_TYPE.COUNT),
      createUiCounterEvent(secondEventName, METRIC_TYPE.COUNT),
      createUiCounterEvent(firstEventName, METRIC_TYPE.CLICK, 2),
    ]);

    const response = await apiClient.post(testData.UI_COUNTERS_REPORT_PATH, {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...testData.INTERNAL_HEADERS },
      responseType: 'json',
      body: { report },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({ status: 'ok' });

    await expect
      .poll(async () => toTypeAndCount(await findCounters(kbnClient, firstEventName)), {
        timeout: COUNTER_STORED_TIMEOUT,
        intervals: [1_000],
      })
      .toStrictEqual([
        { counterType: METRIC_TYPE.CLICK, count: 2 },
        { counterType: METRIC_TYPE.COUNT, count: 1 },
      ]);

    await expect
      .poll(async () => toTypeAndCount(await findCounters(kbnClient, secondEventName)), {
        timeout: COUNTER_STORED_TIMEOUT,
        intervals: [1_000],
      })
      .toStrictEqual([{ counterType: METRIC_TYPE.COUNT, count: 1 }]);
  });
});
