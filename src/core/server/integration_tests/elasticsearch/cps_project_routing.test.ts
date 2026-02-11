/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TestServerlessESUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServerlessInstances } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

const TEST_INDEX = 'cps-routing-integration-test';
const LOCAL_PROJECT_ROUTING = '_tag._alias:_local';

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
 * to a real ES server to empircally verify that such errors do not happen.
 *
 * IMPORTANT: These tests require a serverless ES instance with CPS support enabled.
 * Currently, CPS is not available in serverless ES, so the tests are skipped.
 * Once CPS is available, these tests will run, and you can remove the `itIfCpsSupported()`.
 *
 * @see src/core/packages/elasticsearch/server-internal/src/elasticsearch_service.ts
 */
describe('CPS project_routing on serverless ES', () => {
  let serverlessES: TestServerlessESUtils;
  let client: ElasticsearchClient;
  let cpsSupported = false;

  beforeAll(async () => {
    const { startES } = createTestServerlessInstances({
      adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
    });

    serverlessES = await startES();
    client = serverlessES.getClient();

    await client.indices.create({
      index: TEST_INDEX,
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

    /**
     * We assert that CPS is enabled ES-side by sending a test request with project_routing.
     * This allows us to both implement the tests and wait for CPS to be enabled in ES.
     * This branching logic can be removed once CPS is enabled in ES.
     */
    try {
      await client.search(
        { index: TEST_INDEX, size: 0 },
        { querystring: { project_routing: LOCAL_PROJECT_ROUTING } }
      );
      cpsSupported = true;
    } catch (error: any) {
      if (error?.message?.includes('unrecognized parameter: [project_routing]')) {
        cpsSupported = false;
        // eslint-disable-next-line no-console
        console.log(
          '\n⚠️  CPS (project_routing) is not supported in this ES serverless image.\n' +
            '   CPS-specific tests will be skipped. Once CPS is available, they will run automatically.\n'
        );
      } else {
        throw error;
      }
    }
  });

  afterAll(async () => {
    await client?.indices.delete({ index: TEST_INDEX }).catch(() => {});
    await serverlessES?.stop();
  });

  // can be removed once cps is enabled in ES (and migrate back to plain `it()`)
  const itIfCpsSupported = (name: string, fn: () => Promise<void>) => {
    it(name, async () => {
      if (!cpsSupported) {
        // eslint-disable-next-line no-console
        console.log(`    ⏭️  Skipped: CPS not available in this ES version`);
        return;
      }
      await fn();
    });
  };

  describe('baseline: requests without project_routing (no-op cases)', () => {
    it('search works without project_routing', async () => {
      const response = await client.search({
        index: TEST_INDEX,
        query: { match_all: {} },
      });

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    it('msearch works without project_routing', async () => {
      const response = await client.msearch({
        searches: [
          { index: TEST_INDEX },
          { query: { match_all: {} } },
          { index: TEST_INDEX },
          { query: { term: { category: 'alpha' } } },
        ],
      });

      expect(response.responses.length).toBe(2);
      expect((response.responses[0] as any).hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      expect((response.responses[1] as any).hits.hits.length).toBe(ALPHA_CATEGORY_DOCS_COUNT);
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
    itIfCpsSupported('accepts project_routing parameter without error', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    itIfCpsSupported('works with match query', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match: { title: 'document' } },
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(DOCS_WITH_DOCUMENT_IN_TITLE);
    });

    itIfCpsSupported('works with term query', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { term: { category: 'alpha' } },
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(ALPHA_CATEGORY_DOCS_COUNT);
    });

    itIfCpsSupported('works with bool query', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: {
            bool: {
              must: [{ match: { title: 'document' } }],
              filter: [{ term: { category: 'beta' } }],
            },
          },
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(BETA_CATEGORY_DOCS_COUNT);
    });

    itIfCpsSupported('works with aggregations', async () => {
      const response = await client.search(
        {
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
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.aggregations).toBeDefined();
      expect(response.aggregations!.categories).toBeDefined();
      expect(response.aggregations!.avg_count).toBeDefined();
    });

    itIfCpsSupported('works with sort', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
          sort: [{ count: 'desc' }],
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      const counts = response.hits.hits.map((hit: any) => hit._source.count);
      expect(counts).toEqual(SORTED_COUNTS_DESC);
    });

    itIfCpsSupported('works with pagination (from/size)', async () => {
      const pageSize = 2;
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
          from: 2,
          size: pageSize,
          sort: [{ count: 'asc' }],
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(pageSize);
    });

    itIfCpsSupported('works with _source filtering', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
          _source: ['title', 'category'],
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      const firstHit = response.hits.hits[0]._source as any;
      expect(firstHit.title).toBeDefined();
      expect(firstHit.category).toBeDefined();
      expect(firstHit.count).toBeUndefined();
    });

    itIfCpsSupported('works with highlight', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match: { title: 'First' } },
          highlight: {
            fields: { title: {} },
          },
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(FIRST_TITLE_DOCS_COUNT);
      expect(response.hits.hits[0].highlight).toBeDefined();
    });

    itIfCpsSupported('works with wildcard index pattern', async () => {
      const response = await client.search(
        {
          index: 'cps-routing-*',
          query: { match_all: {} },
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    itIfCpsSupported('works with non-existent index pattern (allow_no_indices)', async () => {
      const response = await client.search(
        {
          index: 'nonexistent-index-*',
          query: { match_all: {} },
          allow_no_indices: true,
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      // Non-existent index returns no hits
      expect(response.hits.hits).toHaveLength(0);
    });
  });

  describe('msearch API with project_routing', () => {
    itIfCpsSupported('accepts project_routing parameter without error', async () => {
      const response = await client.msearch(
        {
          searches: [
            { index: TEST_INDEX },
            { query: { match_all: {} } },
            { index: TEST_INDEX },
            { query: { term: { category: 'alpha' } } },
          ],
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      const expectedMsearchQueries = 2; // Two searches in the msearch request above
      expect(response.responses.length).toBe(expectedMsearchQueries);
      expect((response.responses[0] as any).hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      expect((response.responses[1] as any).hits.hits.length).toBe(ALPHA_CATEGORY_DOCS_COUNT);
    });
  });

  describe('count API with project_routing', () => {
    itIfCpsSupported('accepts project_routing parameter without error', async () => {
      const response = await client.count(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.count).toBe(TOTAL_DOCS_COUNT);
    });

    itIfCpsSupported('works with filtered count', async () => {
      const response = await client.count(
        {
          index: TEST_INDEX,
          query: { term: { category: 'alpha' } },
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.count).toBe(ALPHA_CATEGORY_DOCS_COUNT);
    });
  });

  describe('PIT (Point-In-Time) operations', () => {
    itIfCpsSupported(
      'can open PIT without project_routing (PIT establishes its own scope)',
      async () => {
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
      }
    );
  });

  describe('edge cases and error scenarios', () => {
    itIfCpsSupported('handles empty query with project_routing', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    itIfCpsSupported('works with track_total_hits', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
          track_total_hits: true,
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect((response.hits.total as any).value).toBe(TOTAL_DOCS_COUNT);
    });

    itIfCpsSupported('works with explain', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match: { title: 'First' } },
          explain: true,
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(FIRST_TITLE_DOCS_COUNT);
      expect(response.hits.hits[0]._explanation).toBeDefined();
    });

    itIfCpsSupported('works with seq_no_primary_term', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
          seq_no_primary_term: true,
        },
        {
          querystring: { project_routing: LOCAL_PROJECT_ROUTING },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
      expect(response.hits.hits[0]._seq_no).toBeDefined();
      expect(response.hits.hits[0]._primary_term).toBeDefined();
    });
  });

  describe('combined with other querystring params', () => {
    itIfCpsSupported('works with pretty=true', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
        },
        {
          querystring: {
            project_routing: LOCAL_PROJECT_ROUTING,
            pretty: true,
          },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    itIfCpsSupported('works with request_cache=false', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
        },
        {
          querystring: {
            project_routing: LOCAL_PROJECT_ROUTING,
            request_cache: false,
          },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });

    itIfCpsSupported('works with timeout', async () => {
      const response = await client.search(
        {
          index: TEST_INDEX,
          query: { match_all: {} },
        },
        {
          querystring: {
            project_routing: LOCAL_PROJECT_ROUTING,
            timeout: '30s',
          },
        }
      );

      expect(response.hits.hits.length).toBe(TOTAL_DOCS_COUNT);
    });
  });
});
