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

const LOCAL_PROJECT_ROUTING = '_alias:_origin';

describe('project_routing on non-serverless', () => {
  it('Kibana removes project_routing information from requests when not serverless', async () => {
    // When not serverless, ElasticsearchService sets cpsEnabled to false (elasticsearch_service.ts),
    // so CpsRequestHandler strips project_routing. The cps plugin config only exposes cpsEnabled
    // for the serverless offering (offeringBasedSchema), so are not allowed to enable it here.
    const { startES, startKibana } = createTestServers({
      adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
    });
    const esServer = await startES();
    const kibanaServer = await startKibana();
    const esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    try {
      const response = await esClient.search({
        index: '.kibana',
        size: 0,
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });
      expect(response.hits.hits).toBeDefined();
    } finally {
      await kibanaServer.stop();
      await esServer.stop();
    }
  });
});
