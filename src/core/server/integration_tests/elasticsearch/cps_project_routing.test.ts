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

const TEST_INDEX = '.kibana_cps-routing-integration-test';
const LOCAL_PROJECT_ROUTING = '_alias:_origin';

// Test documents - defined at module scope so we can derive counts from them
const TEST_DOCUMENTS = [
  { title: 'First document', category: 'alpha', timestamp: '2024-01-01', count: 10 },
  { title: 'Second document', category: 'beta', timestamp: '2024-01-02', count: 20 },
  { title: 'Third document', category: 'alpha', timestamp: '2024-01-03', count: 30 },
  { title: 'Fourth document', category: 'gamma', timestamp: '2024-01-04', count: 40 },
  { title: 'Fifth document', category: 'beta', timestamp: '2024-01-05', count: 50 },
] as const;

const TOTAL_DOCS_COUNT = TEST_DOCUMENTS.length;
const ALPHA_CATEGORY_DOCS_COUNT = TEST_DOCUMENTS.filter((d) => d.category === 'alpha').length;
const BETA_CATEGORY_DOCS_COUNT = TEST_DOCUMENTS.filter((d) => d.category === 'beta').length;
const FIRST_TITLE_DOCS_COUNT = TEST_DOCUMENTS.filter((d) => d.title === 'First document').length;
const DOCS_WITH_DOCUMENT_IN_TITLE = TEST_DOCUMENTS.filter((d) =>
  d.title.includes('document')
).length;
const SORTED_COUNTS_DESC = [...TEST_DOCUMENTS]
  .sort((a, b) => b.count - a.count)
  .map((d) => d.count);

/**
 * Integration tests for CPS (Cross-Project Search) project_routing parameter.
 *
 * It's important that we properly inject the `project_routing` parameter. Incorrect
 * injection can cause 400 errors for requests that should otherwise pass, and risk
 * of breaking requests to ES at a large scale. The integration tests send real requests
 * to a real ES server to empirically verify that such errors do not happen.
 *
 * These tests start a serverless ES instance with CPS enabled (`enableCPS: true`).
 *
 * @see src/core/packages/elasticsearch/server-internal/src/elasticsearch_service.ts
 */
describe('CPS project_routing on serverless ES', () => {
  let serverlessES: TestServerlessESUtils;
  let serverlessKibana: TestServerlessKibanaUtils;
  let client: ElasticsearchClient;

  beforeAll(async () => {
    const { startES, startKibana } = createTestServerlessInstances({
      adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
      enableCPS: true,
      // Match `yarn es serverless --projectType observability ...`
      projectType: 'oblt',
      // Required to apply the UIAM/serverless ES args block (mock IDP/project metadata).
      kibanaUrl: 'http://localhost:5601/',
      // Setup-only: use superuser so tests can create temp indices.
      kibana: {
        settings: {
          elasticsearch: {
            username: systemIndicesSuperuser.username,
            password: systemIndicesSuperuser.password,
          },
        },
      },
    });
    serverlessES = await startES();
    serverlessKibana = await startKibana();
    client = serverlessKibana.coreStart.elasticsearch.client.asInternalUser;

    await client.indices.create({
      index: TEST_INDEX,
      settings: { hidden: true },
      mappings: {
        properties: {
          title: { type: 'text' },
          category: { type: 'keyword' },
          timestamp: { type: 'date' },
          count: { type: 'integer' },
        },
      },
    });

    for (const doc of TEST_DOCUMENTS) {
      await client.index({ index: TEST_INDEX, document: doc });
    }

    await client.indices.refresh({ index: TEST_INDEX });
  });

  afterEach(async () => {
    // Make mutations from tests deterministic (index/delete/update become visible).
    await client?.indices.refresh({ index: TEST_INDEX }).catch(() => {});
  });

  afterAll(async () => {
    await client?.indices.delete({ index: TEST_INDEX }).catch(() => {});
    await serverlessKibana?.stop();
    await serverlessES?.stop();
  });

  describe('baseline: requests without project_routing (no-op cases)', () => {
    it('search works without project_routing', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { match_all: {} },
      });

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    it('msearch works without project_routing', async () => {
      // msearch uses newline-delimited JSON (NDJSON) format
      const ndjson =
        JSON.stringify({ index: TEST_INDEX }) +
        '\n' +
        JSON.stringify({ query: { match_all: {} } }) +
        '\n' +
        JSON.stringify({ index: TEST_INDEX }) +
        '\n' +
        JSON.stringify({ query: { term: { category: 'alpha' } } }) +
        '\n';

      const response: any = await client.transport.request(
        {
          method: 'POST',
          path: '/_msearch',
          body: ndjson,
        },
        {
          headers: {
            'content-type': 'application/x-ndjson',
          },
        }
      );

      expect(response.responses.length).toBe(2);
      expect(response.responses[0].hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      expect(response.responses[1].hits.hits.length).toBe(ALPHA_CATEGORY_DOCS_COUNT);
    });

    it('count works without project_routing', async () => {
      const response = await client.count({
        index: TEST_INDEX,
        query: { match_all: {} },
      });

      expect(response.count).toBe(TOTAL_DOCS_COUNT);
    });

    it('PIT operations work without project_routing (PIT has its own scope)', async () => {
      const pitResponse = await client.openPointInTime({
        index: TEST_INDEX,
        keep_alive: '1m',
      });

      expect(pitResponse.id).toBeDefined();

      // Search using PIT - no project_routing needed
      const searchResponse = await client.search({
        pit: { id: pitResponse.id, keep_alive: '1m' },
        query: { match_all: {} },
      });

      expect(searchResponse.hits.hits.length).toBe(TOTAL_DOCS_COUNT);

      await client.closePointInTime({ id: pitResponse.id });
    });

    it('index operations work without project_routing', async () => {
      // Index a document
      const indexResponse = await client.index({
        index: TEST_INDEX,
        document: { title: 'Temp doc', category: 'temp', timestamp: '2024-01-10', count: 100 },
      });

      expect(indexResponse._id).toBeDefined();

      // Get the document
      const getResponse = await client.get({
        index: TEST_INDEX,
        id: indexResponse._id,
      });

      expect(getResponse.found).toBe(true);

      // Delete the document (cleanup)
      await client.delete({
        index: TEST_INDEX,
        id: indexResponse._id,
      });
    });

    it('bulk operations work without project_routing', async () => {
      const bulkResponse = await client.bulk({
        operations: [
          { index: { _index: TEST_INDEX } },
          { title: 'Bulk doc 1', category: 'bulk', timestamp: '2024-01-11', count: 101 },
          { index: { _index: TEST_INDEX } },
          { title: 'Bulk doc 2', category: 'bulk', timestamp: '2024-01-12', count: 102 },
        ],
      });

      expect(bulkResponse.errors).toBe(false);
      expect(bulkResponse.items.length).toBe(2);

      // Cleanup
      for (const item of bulkResponse.items) {
        if (item.index?._id) {
          await client.delete({ index: TEST_INDEX, id: item.index._id }).catch(() => {});
        }
      }
    });

    it('aggregations work without project_routing', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        size: 0,
        aggs: {
          categories: { terms: { field: 'category' } },
          avg_count: { avg: { field: 'count' } },
        },
      });

      expect(response.aggregations).toBeDefined();
      expect(response.aggregations!.categories).toBeDefined();
      expect(response.aggregations!.avg_count).toBeDefined();
    });

    it('scroll works without project_routing', async () => {
      const scrollResponse = await client.search({
        index: TEST_INDEX,
        query: { match_all: {} },
        size: 2,
        scroll: '1m',
      });

      expect(scrollResponse._scroll_id).toBeDefined();
      expect(scrollResponse.hits.hits.length).toBe(2);

      // Continue scrolling
      const scrollContinue = await client.scroll({
        scroll_id: scrollResponse._scroll_id!,
        scroll: '1m',
      });

      expect(scrollContinue.hits.hits.length).toBeGreaterThanOrEqual(0);

      // Clear scroll
      await client.clearScroll({ scroll_id: scrollResponse._scroll_id! });
    });

    it('cat APIs work without project_routing', async () => {
      const response = await client.cat.indices({ format: 'json' });
      expect(Array.isArray(response)).toBe(true);
    });

    it('cluster health works without project_routing', async () => {
      const response = await client.cluster.health();
      expect(response.cluster_name).toBeDefined();
      expect(response.status).toBeDefined();
    });
  });

  describe('search API with project_routing', () => {
    it('accepts project_routing parameter without error', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { match_all: {} },
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    it('works with match query', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { match: { title: 'document' } },
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(DOCS_WITH_DOCUMENT_IN_TITLE);
    });

    it('works with term query', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { term: { category: 'alpha' } },
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(ALPHA_CATEGORY_DOCS_COUNT);
    });

    it('works with bool query', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: {
          bool: {
            must: [{ match: { title: 'document' } }],
            filter: [{ term: { category: 'beta' } }],
          },
        },
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(BETA_CATEGORY_DOCS_COUNT);
    });

    it('works with aggregations', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        size: 0,
        aggs: {
          categories: {
            terms: { field: 'category' },
          },
          avg_count: {
            avg: { field: 'count' },
          },
        },
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.aggregations).toBeDefined();
      expect(response.aggregations!.categories).toBeDefined();
      expect(response.aggregations!.avg_count).toBeDefined();
    });

    it('works with sort', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { match_all: {} },
        sort: [{ count: 'desc' }],
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      const counts = response.hits.hits.map((hit: any) => hit._source.count);
      expect(counts).toEqual(SORTED_COUNTS_DESC);
    });

    it('works with pagination (from/size)', async () => {
      const pageSize = 2;
      const response = await client.search({
        index: TEST_INDEX,
        query: { match_all: {} },
        from: 2,
        size: pageSize,
        sort: [{ count: 'asc' }],
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(pageSize);
    });

    it('works with _source filtering', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { match_all: {} },
        _source: ['title', 'category'],
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      const firstHit = response.hits.hits[0]._source as any;
      expect(firstHit.title).toBeDefined();
      expect(firstHit.category).toBeDefined();
      expect(firstHit.count).toBeUndefined();
    });

    it('works with highlight', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { match: { title: 'First' } },
        highlight: {
          fields: { title: {} },
        },
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(FIRST_TITLE_DOCS_COUNT);
      expect(response.hits.hits[0].highlight).toBeDefined();
    });

    it('works with wildcard index pattern', async () => {
      const response = await client.search({
        index: '.kibana_cps-routing-*',
        query: { match_all: {} },
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    it('works with non-existent index pattern (allow_no_indices)', async () => {
      const response = await client.search({
        index: 'nonexistent-index-*',
        query: { match_all: {} },
        allow_no_indices: true,
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      // Non-existent index returns no hits
      expect(response.hits.hits).toHaveLength(0);
    });
  });

  describe('msearch API with project_routing', () => {
    it('accepts project_routing parameter without error', async () => {
      // msearch uses newline-delimited JSON (NDJSON) format
      const ndjson =
        JSON.stringify({ index: TEST_INDEX }) +
        '\n' +
        JSON.stringify({ query: { match_all: {} } }) +
        '\n' +
        JSON.stringify({ index: TEST_INDEX }) +
        '\n' +
        JSON.stringify({ query: { term: { category: 'alpha' } } }) +
        '\n';

      const response: any = await client.transport.request(
        {
          method: 'POST',
          path: '/_msearch',
          body: ndjson,
          querystring: {
            project_routing: LOCAL_PROJECT_ROUTING,
          },
        },
        {
          headers: {
            'content-type': 'application/x-ndjson',
          },
        }
      );

      const expectedMsearchQueries = 2; // Two searches in the msearch request above
      expect(response.responses.length).toBe(expectedMsearchQueries);
      expect(response.responses[0].hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      expect((response.responses[1] as any).hits.hits.length).toBe(ALPHA_CATEGORY_DOCS_COUNT);
    });
  });

  describe('count API with project_routing', () => {
    it('accepts project_routing parameter without error', async () => {
      const response = await client.count({
        index: TEST_INDEX,
        query: { match_all: {} },
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.count).toBe(TOTAL_DOCS_COUNT);
    });

    it('works with filtered count', async () => {
      const response = await client.count({
        index: TEST_INDEX,
        query: { term: { category: 'alpha' } },
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.count).toBe(ALPHA_CATEGORY_DOCS_COUNT);
    });
  });

  describe('PIT (Point-In-Time) operations', () => {
    it('can open PIT without project_routing (PIT establishes its own scope)', async () => {
      const pitResponse = await client.openPointInTime({
        index: TEST_INDEX,
        keep_alive: '1m',
      });

      expect(pitResponse.id).toBeDefined();

      // Search using PIT (no project_routing needed - PIT has its own scope)
      const searchResponse = await client.search({
        pit: { id: pitResponse.id, keep_alive: '1m' },
        query: { match_all: {} },
      });

      expect(searchResponse.hits.hits.length).toBe(TOTAL_DOCS_COUNT);

      // Close PIT
      await client.closePointInTime({ id: pitResponse.id });
    });
  });

  describe('edge cases and error scenarios', () => {
    it('handles empty query with project_routing', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    it('works with track_total_hits', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { match_all: {} },
        track_total_hits: true,
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect((response.hits.total as any).value).toBe(TOTAL_DOCS_COUNT);
    });

    it('works with explain', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { match: { title: 'First' } },
        explain: true,
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(FIRST_TITLE_DOCS_COUNT);
      expect(response.hits.hits[0]._explanation).toBeDefined();
    });

    it('works with seq_no_primary_term', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { match_all: {} },
        seq_no_primary_term: true,
        body: {
          // @ts-expect-error - project_routing is a valid body parameter
          project_routing: LOCAL_PROJECT_ROUTING,
        },
      });

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      expect(response.hits.hits[0]._seq_no).toBeDefined();
      expect(response.hits.hits[0]._primary_term).toBeDefined();
    });
  });

  describe('combined with other params', () => {
    it('works with pretty=true', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
          body: {
            // @ts-expect-error - project_routing is a valid body parameter
            project_routing: LOCAL_PROJECT_ROUTING,
          },
        },
        {
          querystring: {
            pretty: true,
          },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    it('works with request_cache=false', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
          body: {
            // @ts-expect-error - project_routing is a valid body parameter
            project_routing: LOCAL_PROJECT_ROUTING,
          },
        },
        {
          querystring: {
            request_cache: false,
          },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    it('works with timeout', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
          body: {
            // @ts-expect-error - project_routing is a valid body parameter
            project_routing: LOCAL_PROJECT_ROUTING,
          },
        },
        {
          querystring: {
            timeout: '30s',
          },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });
  });

  /**
   * Tests for project_routing using the low-level transport.request() API.
   * These tests verify that project_routing works correctly when passed directly
   * in the request body via transport.request(), as an alternative to using the
   * higher-level client methods (search, count, msearch, etc.).
   */
  describe('project_routing using transport.request()', () => {
    it('search works with project_routing to origin project', async () => {
      const response: any = await client.transport.request({
        method: 'POST',
        path: `/${TEST_INDEX}/_search`,
        body: {
          project_routing: LOCAL_PROJECT_ROUTING,
          query: { match_all: {} },
        },
      });

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    it('search with filters works with project_routing', async () => {
      const response: any = await client.transport.request({
        method: 'POST',
        path: `/${TEST_INDEX}/_search`,
        body: {
          project_routing: LOCAL_PROJECT_ROUTING,
          query: { term: { category: 'alpha' } },
        },
      });

      expect(response.hits.hits.length).toBe(ALPHA_CATEGORY_DOCS_COUNT);
    });

    it('count works with project_routing', async () => {
      const response: any = await client.transport.request({
        method: 'POST',
        path: `/${TEST_INDEX}/_count`,
        body: {
          project_routing: LOCAL_PROJECT_ROUTING,
          query: { match_all: {} },
        },
      });

      expect(response.count).toBe(TOTAL_DOCS_COUNT);
    });

    it('msearch works with project_routing', async () => {
      // msearch uses newline-delimited JSON (NDJSON) format
      const ndjson =
        JSON.stringify({ index: TEST_INDEX }) +
        '\n' +
        JSON.stringify({ query: { match_all: {} } }) +
        '\n' +
        JSON.stringify({ index: TEST_INDEX }) +
        '\n' +
        JSON.stringify({ query: { term: { category: 'beta' } } }) +
        '\n' +
        JSON.stringify({ project_routing: LOCAL_PROJECT_ROUTING }) +
        '\n';

      const response: any = await client.transport.request(
        {
          method: 'POST',
          path: '/_msearch',
          body: ndjson,
        },
        {
          headers: {
            'content-type': 'application/x-ndjson',
          },
        }
      );

      expect(response.responses.length).toBe(2);
      expect(response.responses[0].hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      expect(response.responses[1].hits.hits.length).toBe(BETA_CATEGORY_DOCS_COUNT);
    });

    it('search with match query works with project_routing', async () => {
      const response: any = await client.transport.request({
        method: 'POST',
        path: `/${TEST_INDEX}/_search`,
        body: {
          project_routing: LOCAL_PROJECT_ROUTING,
          query: { match: { title: 'document' } },
        },
      });

      expect(response.hits.hits.length).toBe(DOCS_WITH_DOCUMENT_IN_TITLE);
    });

    it('search with sort works with project_routing', async () => {
      const response: any = await client.transport.request({
        method: 'POST',
        path: `/${TEST_INDEX}/_search`,
        body: {
          project_routing: LOCAL_PROJECT_ROUTING,
          query: { match_all: {} },
          sort: [{ count: { order: 'desc' } }],
        },
      });

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      const counts = response.hits.hits.map((hit: any) => hit._source.count);
      expect(counts).toEqual(SORTED_COUNTS_DESC);
    });
  });
});
