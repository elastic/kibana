/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ReportManager, METRIC_TYPE } from '@kbn/analytics';
import {
  apiTest,
  createUiCounterEvent,
  testData,
  toTypeAndCount,
  uniqueEventName,
} from '../fixtures';

const {
  UI_COUNTERS_APP_NAME: domainId,
  UI_METRIC_SAVED_OBJECT_TYPE,
  USAGE_COUNTER_SAVED_OBJECT_TYPE,
  USAGE_COUNTER_STORED_TIMEOUT,
} = testData;

apiTest.describe('UI counters API', { tag: ['@local-stateful-classic'] }, () => {
  let viewerApiCredentials: RoleApiCredentials;
  const reportedEventNames: string[] = [];

  apiTest.beforeAll(async ({ requestAuth }) => {
    viewerApiCredentials = await requestAuth.getApiKey('viewer');
  });

  apiTest.afterAll(async ({ apiServices, kbnClient }) => {
    // The report endpoint also writes a legacy `ui-metric` object per event.
    const objects = reportedEventNames.map((eventName) => ({
      type: UI_METRIC_SAVED_OBJECT_TYPE,
      id: `${domainId}:${eventName}`,
    }));
    for (const eventName of reportedEventNames) {
      const counters = await apiServices.usageCounters.find({ domainId, counterName: eventName });
      for (const { id } of counters) {
        objects.push({ type: USAGE_COUNTER_SAVED_OBJECT_TYPE, id });
      }
    }
    await kbnClient.savedObjects.bulkDelete({ objects });
  });

  apiTest(
    'stores ui counter events in usage counters saved objects',
    async ({ apiClient, apiServices }) => {
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
        .poll(
          async () =>
            toTypeAndCount(
              await apiServices.usageCounters.find({ domainId, counterName: eventName })
            ),
          {
            timeout: USAGE_COUNTER_STORED_TIMEOUT,
            intervals: [1_000],
          }
        )
        .toStrictEqual([{ counterType: METRIC_TYPE.COUNT, count: 1 }]);
    }
  );

  apiTest('supports multiple events', async ({ apiClient, apiServices }) => {
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
      .poll(
        async () =>
          toTypeAndCount(
            await apiServices.usageCounters.find({ domainId, counterName: firstEventName })
          ),
        {
          timeout: USAGE_COUNTER_STORED_TIMEOUT,
          intervals: [1_000],
        }
      )
      .toStrictEqual([
        { counterType: METRIC_TYPE.CLICK, count: 2 },
        { counterType: METRIC_TYPE.COUNT, count: 1 },
      ]);

    await expect
      .poll(
        async () =>
          toTypeAndCount(
            await apiServices.usageCounters.find({ domainId, counterName: secondEventName })
          ),
        {
          timeout: USAGE_COUNTER_STORED_TIMEOUT,
          intervals: [1_000],
        }
      )
      .toStrictEqual([{ counterType: METRIC_TYPE.COUNT, count: 1 }]);
  });
});
