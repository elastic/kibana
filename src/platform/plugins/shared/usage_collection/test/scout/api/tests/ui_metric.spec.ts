/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ReportManager, METRIC_TYPE } from '@kbn/analytics';
import type { UserAgentMetric, UiCounterMetricType } from '@kbn/analytics';
import { apiTest, testData } from '../fixtures';

const UI_METRIC_TYPE = 'ui-metric';

const createStatsMetric = (
  eventName: string,
  type: UiCounterMetricType = METRIC_TYPE.CLICK,
  count = 1
) => ({
  eventName,
  appName: 'myApp',
  type,
  count,
});

const createUserAgentMetric = (appName: string): UserAgentMetric => ({
  appName,
  type: METRIC_TYPE.USER_AGENT,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36',
});

const uniqueEventName = (): string => {
  const hrTime = process.hrtime();
  const nano = hrTime[0] * 1000000000 + hrTime[1];
  return `myEvent${nano}`;
};

apiTest.describe('ui_metric savedObject data', { tag: tags.deploymentAgnostic }, () => {
  let viewerApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    viewerApiCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.savedObjects.clean({ types: [UI_METRIC_TYPE] });
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: [UI_METRIC_TYPE] });
  });

  apiTest(
    'increments the count field in the document defined by the app/action_type path',
    async ({ apiClient, kbnClient }) => {
      const reportManager = new ReportManager();
      const eventName = uniqueEventName();
      const uiStatsMetric = createStatsMetric(eventName);
      const { report } = reportManager.assignReports([uiStatsMetric]);
      const savedObjectId = `myApp:${eventName}`;

      const response = await apiClient.post(testData.UI_COUNTERS_REPORT_PATH, {
        headers: {
          ...viewerApiCredentials.apiKeyHeader,
          ...testData.INTERNAL_HEADERS,
        },
        responseType: 'json',
        body: { report },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok' });

      const savedObject = await kbnClient.savedObjects.get<{ count: number }>({
        type: UI_METRIC_TYPE,
        id: savedObjectId,
      });
      expect(savedObject.id).toBe(savedObjectId);
      expect(savedObject.attributes.count).toBe(1);
    }
  );

  apiTest('supports multiple events', async ({ apiClient, kbnClient }) => {
    const reportManager = new ReportManager();
    const userAgentMetric = createUserAgentMetric('kibana');
    const eventName1 = uniqueEventName();
    const eventName2 = uniqueEventName();
    const { report } = reportManager.assignReports([
      userAgentMetric,
      createStatsMetric(eventName1),
      createStatsMetric(eventName2),
    ]);

    const response = await apiClient.post(testData.UI_COUNTERS_REPORT_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: { report },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({ status: 'ok' });

    const metric1 = await kbnClient.savedObjects.get({
      type: UI_METRIC_TYPE,
      id: `myApp:${eventName1}`,
    });
    const metric2 = await kbnClient.savedObjects.get({
      type: UI_METRIC_TYPE,
      id: `myApp:${eventName2}`,
    });
    const userAgent = await kbnClient.savedObjects.get({
      type: UI_METRIC_TYPE,
      id: `kibana-user_agent:${userAgentMetric.userAgent}`,
    });

    expect(metric1.id).toBe(`myApp:${eventName1}`);
    expect(metric2.id).toBe(`myApp:${eventName2}`);
    expect(userAgent.id).toBe(`kibana-user_agent:${userAgentMetric.userAgent}`);
  });

  apiTest('aggregates multiple events with same eventID', async ({ apiClient, kbnClient }) => {
    const reportManager = new ReportManager();
    const eventName = uniqueEventName();
    const { report } = reportManager.assignReports([
      createStatsMetric(eventName, METRIC_TYPE.CLICK, 2),
      createStatsMetric(eventName, METRIC_TYPE.LOADED),
    ]);

    const response = await apiClient.post(testData.UI_COUNTERS_REPORT_PATH, {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.INTERNAL_HEADERS,
      },
      responseType: 'json',
      body: { report },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({ status: 'ok' });

    const countTypeEvent = await kbnClient.savedObjects.get<{ count: number }>({
      type: UI_METRIC_TYPE,
      id: `myApp:${eventName}`,
    });
    expect(countTypeEvent.attributes.count).toBe(3);
  });
});
