/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @jest-environment node
 */

import type {
  TestServerlessESUtils,
  TestServerlessKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { createTestServerlessInstances } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { systemIndicesSuperuser } from '@kbn/test';

const SYSTEM_INDEX = '.kibana';
const TEST_INDEX = 'cps-routing-integration-test';
const ALL_PROJECT_ROUTING = '_alias:*';

/**
 * Integration tests for CPS (Cross-Project Search) project_routing parameter.
 *
 * It's important that we properly strip the `project_routing` parameter. Incorrect
 * injection can cause 400 errors for requests that should otherwise pass, and risk
 * of breaking requests to ES at a large scale. The integration tests send real requests
 * to a real ES server to empirically verify that such errors do not happen.
 *
 * These tests start a serverless ES instance with CPS disabled (`enableCPS: false`).
 *
 * @see src/core/packages/elasticsearch/server-internal/src/elasticsearch_service.ts
 */
describe('project_routing on serverless non-CPS', () => {
  let serverlessES: TestServerlessESUtils;
  let serverlessKibana: TestServerlessKibanaUtils;
  let client: ElasticsearchClient;

  beforeAll(async () => {
    const { startES } = serverlessInstances(false);
    serverlessES = await startES();
  });

  describe(`'cps' plugin disabled`, () => {
    beforeAll(async () => {
      const { startKibana } = serverlessInstances(false);
      serverlessKibana = await startKibana();
      client = serverlessKibana.coreStart.elasticsearch.client.asInternalUser;
      await client.indices.create({ index: TEST_INDEX });
    });

    afterAll(async () => {
      await client?.indices.delete({ index: TEST_INDEX }).catch(() => {});
      await serverlessKibana?.stop();
    });

    it('does NOT inject project_routing', async () => {
      await expect(
        client.search({ index: SYSTEM_INDEX, query: { match_all: {} } })
      ).resolves.not.toThrow();

      await expect(
        client.search({ index: TEST_INDEX, query: { match_all: {} } })
      ).resolves.not.toThrow();
    });

    it('strips project_routing', async () => {
      await expect(
        client.search({
          index: SYSTEM_INDEX,
          query: { match_all: {} },
          project_routing: ALL_PROJECT_ROUTING,
        })
      ).resolves.not.toThrow();

      await expect(
        client.search({
          index: TEST_INDEX,
          query: { match_all: {} },
          project_routing: ALL_PROJECT_ROUTING,
        })
      ).resolves.not.toThrow();
    });

    it('msearch does NOT inject project_routing and succeeds', async () => {
      await expect(
        client.msearch({
          searches: [{ index: TEST_INDEX }, { query: { match_all: {} } }],
        })
      ).resolves.not.toThrow();
    });

    it('msearch strips project_routing from querystring and succeeds', async () => {
      await expect(
        client.transport.request(
          {
            method: 'POST',
            path: '/_msearch',
            body:
              JSON.stringify({ index: TEST_INDEX }) +
              '\n' +
              JSON.stringify({ query: { match_all: {} } }) +
              '\n',
            querystring: { project_routing: ALL_PROJECT_ROUTING },
          },
          { headers: { 'content-type': 'application/x-ndjson' } }
        )
      ).resolves.not.toThrow();
    });

    it('msearch strips project_routing from NDJSON body entries and succeeds', async () => {
      // project_routing in individual msearch body entries must be stripped so that
      // non-CPS ES does not reject the request.
      await expect(
        client.transport.request({
          method: 'POST',
          path: '/_msearch',
          bulkBody: [
            { index: TEST_INDEX, project_routing: ALL_PROJECT_ROUTING },
            { query: { match_all: {} }, project_routing: ALL_PROJECT_ROUTING },
          ],
        })
      ).resolves.not.toThrow();
    });

    it('msearch via high-level client strips project_routing from header entries and succeeds', async () => {
      // project_routing is a typed field on MsearchMultisearchHeader. The handler must strip it
      // from the bulkBody array entries so non-CPS ES does not reject the request.
      await expect(
        client.msearch({
          searches: [
            { index: TEST_INDEX, project_routing: ALL_PROJECT_ROUTING },
            { query: { match_all: {} } },
          ],
        })
      ).resolves.not.toThrow();
    });
  });

  describe(`'cps' plugin enabled`, () => {
    beforeAll(async () => {
      const { startKibana } = serverlessInstances(true);
      serverlessKibana = await startKibana();
      client = serverlessKibana.coreStart.elasticsearch.client.asInternalUser;
      await client.indices.create({ index: TEST_INDEX });
    });

    afterAll(async () => {
      await client?.indices.delete({ index: TEST_INDEX }).catch(() => {});
      await serverlessKibana?.stop();
    });

    it('injects project_routing and requests fail', async () => {
      await expect(
        client.search({ index: SYSTEM_INDEX, query: { match_all: {} } })
      ).rejects.toThrow();

      await expect(
        client.search({ index: TEST_INDEX, query: { match_all: {} } })
      ).rejects.toThrow();
    });

    it('does NOT strip project_routing and requests fail', async () => {
      await expect(
        client.search({
          index: SYSTEM_INDEX,
          query: { match_all: {} },
          project_routing: ALL_PROJECT_ROUTING,
        })
      ).rejects.toThrow();

      await expect(
        client.search({
          index: TEST_INDEX,
          query: { match_all: {} },
          project_routing: ALL_PROJECT_ROUTING,
        })
      ).rejects.toThrow();
    });

    it('msearch injects project_routing as query param and requests fail (ES non-CPS)', async () => {
      // Even though project_routing is injected correctly (as a query param), ES itself
      // does not support CPS, so requests are expected to fail.
      await expect(
        client.msearch({
          searches: [{ index: TEST_INDEX }, { query: { match_all: {} } }],
        })
      ).rejects.toThrow();
    });
  });

  afterAll(async () => {
    await serverlessES?.stop();
  });
});

const serverlessInstances = (cpsPlugin: boolean) => {
  return createTestServerlessInstances({
    adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
    enableCPS: false,
    // Match `yarn es serverless --projectType observability ...`
    projectType: 'oblt',
    // Required to apply the UIAM/serverless ES args block (mock IDP/project metadata).
    kibanaUrl: 'http://localhost:5601/',
    // Setup-only: use superuser so tests can create temp indices.
    kibana: {
      settings: {
        ...(cpsPlugin && {
          cps: {
            enabled: true,
            cpsEnabled: true,
          },
        }),
        elasticsearch: {
          username: systemIndicesSuperuser.username,
          password: systemIndicesSuperuser.password,
        },
      },
    },
  });
};
