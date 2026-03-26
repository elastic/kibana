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

import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

const LOCAL_PROJECT_ROUTING = '_alias:_origin';

describe('project_routing on non-serverless', () => {
  // When not serverless, ElasticsearchService sets cpsEnabled to false (elasticsearch_service.ts),
  // so CpsRequestHandler strips project_routing. The cps plugin config only exposes cpsEnabled
  // for the serverless offering (offeringBasedSchema), so are not allowed to enable it here.
  let esServer: Awaited<ReturnType<ReturnType<typeof createTestServers>['startES']>>;
  let kibanaServer: Awaited<ReturnType<ReturnType<typeof createTestServers>['startKibana']>>;
  let esClient: ElasticsearchClient;

  beforeAll(async () => {
    const servers = createTestServers({
      adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
    });
    esServer = await servers.startES();
    kibanaServer = await servers.startKibana();
    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    await kibanaServer?.stop();
    await esServer?.stop();
  });

  it('strips project_routing from body for search requests', async () => {
    const response = await esClient.search({
      index: '.kibana',
      size: 0,
      project_routing: LOCAL_PROJECT_ROUTING,
    });
    expect(response.hits.hits).toBeDefined();
  });

  it('strips project_routing from querystring for msearch requests', async () => {
    // project_routing in the querystring must be stripped for msearch when not on serverless CPS.
    await expect(
      esClient.transport.request(
        {
          method: 'POST',
          path: '/.kibana/_msearch',
          body:
            JSON.stringify({}) +
            '\n' +
            JSON.stringify({ query: { match_all: {} }, size: 0 }) +
            '\n',
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        },
        { headers: { 'content-type': 'application/x-ndjson' } }
      )
    ).resolves.not.toThrow();
  });

  it('msearch via high-level client does not inject project_routing and succeeds', async () => {
    const response = await esClient.msearch({
      searches: [{ index: '.kibana' }, { query: { match_all: {} }, size: 0 }],
    });
    expect(response.responses.length).toBe(1);
  });

  it('msearch strips project_routing from NDJSON body entries and succeeds', async () => {
    // project_routing in individual msearch body entries must be stripped so that
    // non-serverless ES does not reject the request.
    await expect(
      esClient.transport.request({
        method: 'POST',
        path: '/.kibana/_msearch',
        bulkBody: [
          { project_routing: '_alias:_origin' },
          { query: { match_all: {} }, size: 0, project_routing: '_alias:_origin' },
        ],
      })
    ).resolves.not.toThrow();
  });

  it('msearch via high-level client strips project_routing from header entries and succeeds', async () => {
    // project_routing is a typed field on MsearchMultisearchHeader. The handler must strip it
    // from the bulkBody array entries so non-serverless ES does not reject the request.
    await expect(
      esClient.msearch({
        searches: [
          { index: '.kibana', project_routing: LOCAL_PROJECT_ROUTING },
          { query: { match_all: {} }, size: 0 },
        ],
      })
    ).resolves.not.toThrow();
  });
});
