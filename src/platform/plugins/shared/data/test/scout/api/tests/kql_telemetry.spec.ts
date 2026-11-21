/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutWorkerFixtures } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { KQL_TELEMETRY_ROUTE_LATEST_VERSION } from '../../../../common';
import { apiTest } from '../fixtures';

const KQL_OPT_IN_STATS_PATH = '/internal/kql_opt_in_stats';

type CounterName = 'optInCount' | 'optOutCount';

interface KqlTelemetryDoc {
  'kql-telemetry'?: Partial<Record<CounterName, number>>;
}

apiTest.describe('KQL telemetry API', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    headers = {
      ...cookieHeader,
      'content-type': 'application/json',
      [ELASTIC_HTTP_VERSION_HEADER]: KQL_TELEMETRY_ROUTE_LATEST_VERSION,
      'x-elastic-internal-origin': 'kibana',
      'kbn-xsrf': 'scout',
    };
  });

  const getCounter = async (
    esClient: ScoutWorkerFixtures['esClient'],
    counter: CounterName
  ): Promise<number> => {
    const response = await esClient.search<KqlTelemetryDoc>({
      index: ANALYTICS_SAVED_OBJECT_INDEX,
      query: { term: { type: 'kql-telemetry' } },
    });
    return response.hits.hits[0]?._source?.['kql-telemetry']?.[counter] ?? 0;
  };

  const counterCases: Array<{ optIn: boolean; counter: CounterName; label: string }> = [
    { optIn: true, counter: 'optInCount', label: 'in' },
    { optIn: false, counter: 'optOutCount', label: 'out' },
  ];

  for (const { optIn, counter, label } of counterCases) {
    apiTest(
      `should increment the opt *${label}* counter in the kql-telemetry document and report success`,
      async ({ apiClient, esClient }) => {
        const before = await getCounter(esClient, counter);

        const response = await apiClient.post(KQL_OPT_IN_STATS_PATH, {
          headers,
          body: { opt_in: optIn },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.body.success).toBe(true);
        expect(await getCounter(esClient, counter)).toBe(before + 1);
      }
    );
  }

  const invalidBodies: Array<{ name: string; body: Record<string, unknown> }> = [
    { name: 'string', body: { opt_in: 'notabool' } },
    { name: 'number', body: { opt_in: 0 } },
    { name: 'null', body: { opt_in: null } },
    { name: 'undefined', body: { opt_in: undefined } },
    { name: 'missing', body: {} },
  ];

  for (const { name, body } of invalidBodies) {
    apiTest(`should reject a non-boolean opt_in value (${name})`, async ({ apiClient }) => {
      const response = await apiClient.post(KQL_OPT_IN_STATS_PATH, { headers, body });

      expect(response).toHaveStatusCode(400);
    });
  }
});
