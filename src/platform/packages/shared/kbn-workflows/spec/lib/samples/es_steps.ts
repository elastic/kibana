/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// es
// Document Operations: Create, read, update, delete documents
// Search and Query: Execute searches and retrieve data
// Index Operations: Create, list, delete indices
// These sample steps are used to test validation in generateYamlSchemaFromConnectors.es.test.ts and getWorkflowJsonSchema.es.test.ts
export const ES_VALID_SAMPLE_STEPS = [
  // Search operations
  {
    name: 'search-simple-query',
    type: 'elasticsearch.search',
    with: {
      index: 'test-index',
      query: {
        match: {
          // simple syntax for query
          message: 'test',
        },
      },
      size: 10,
    },
  },
  {
    name: 'search-full-query',
    type: 'elasticsearch.search',
    with: {
      index: 'test-index',
      query: {
        match: {
          // full syntax for query
          message: {
            query: 'test',
          },
        },
      },
      size: 10,
    },
  },
  {
    name: 'search-with-all-params',
    type: 'elasticsearch.search',
    with: {
      index: 'test-index',
      query: {
        bool: {
          must: [{ match: { message: 'test' } }],
          filter: [{ range: { timestamp: { gte: 'now-1d' } } }],
        },
      },
      size: 20,
      from: 0,
      timeout: '30s',
      track_total_hits: true,
      _source: ['message', 'timestamp'],
      sort: 'timestamp:desc',
      highlight: {
        fields: {
          message: {},
        },
      },
      aggregations: {
        tags_count: {
          terms: {
            field: 'tags',
            size: 10,
          },
        },
      },
      fields: [{ field: 'message' }, { field: 'timestamp', format: 'epoch_millis' }],
      explain: false,
      track_scores: true,
      min_score: 0.5,
    },
  },
  // ES|QL operations
  {
    name: 'esql-query',
    type: 'elasticsearch.esql.query',
    with: {
      query: `
          FROM library
          | EVAL year = DATE_EXTRACT("year", release_date)
          | WHERE page_count > ?1 AND author == ?2
          | STATS count = COUNT(*) by year
          | WHERE count > ?3
          | LIMIT 5
        `,
      params: [300, 'Frank Herbert', 0],
    },
  },
  {
    name: 'esql-query-with-params',
    type: 'elasticsearch.esql.query',
    with: {
      query: 'FROM logs-* | WHERE @timestamp > NOW() - 1 hour | STATS count = COUNT(*) BY host',
      columnar: false,
      filter: {
        bool: {
          must: [{ term: { 'log.level': 'error' } }],
        },
      },
      locale: 'en-US',
    },
  },
  // Document operations
  {
    name: 'create-document',
    type: 'elasticsearch.index',
    with: {
      index: 'test-index',
      id: '1111-aaaa-bbbb-cccc-1234567890ab',
      document: {
        message: 'test',
      },
    },
  },
  {
    name: 'index-empty-document',
    type: 'elasticsearch.index',
    with: {
      index: 'test-index',
      id: '1',
    },
  },
  {
    name: 'index-document-with-params',
    type: 'elasticsearch.index',
    with: {
      index: 'test-index',
      id: 'doc-with-params',
      document: {
        title: 'Test Document',
        content: 'This is a test document with various parameters.',
        timestamp: '2024-01-01T00:00:00Z',
        tags: ['test', 'sample'],
      },
      refresh: 'wait_for',
      routing: 'user123',
      timeout: '5m',
      pipeline: 'my-pipeline',
      require_alias: false,
    },
  },
  {
    name: 'update-document',
    type: 'elasticsearch.update',
    with: {
      index: 'test-index',
      id: '1',
      doc: {
        message: 'test',
      },
    },
  },
  {
    name: 'update-document-with-params',
    type: 'elasticsearch.update',
    with: {
      index: 'test-index',
      id: '1',
      doc: {
        message: 'updated message',
        updated_at: '2024-01-01T12:00:00Z',
      },
      doc_as_upsert: true,
      retry_on_conflict: 3,
      refresh: 'true',
      routing: 'user123',
      _source: true,
      detect_noop: true,
    },
  },
  {
    name: 'update-document-with-script',
    type: 'elasticsearch.update',
    with: {
      index: 'test-index',
      id: '1',
      script: {
        source: 'ctx._source.counter += params.count; ctx._source.tags.addAll(params.new_tags)',
        lang: 'painless',
        params: {
          count: { value: 1 },
          new_tags: { values: ['updated', 'scripted'] },
        },
      },
      upsert: {
        counter: 1,
        tags: [],
      },
    },
  },
  // Index management operations
  {
    name: 'create-index',
    type: 'elasticsearch.indices.create',
    with: {
      index: 'test-index',
      mappings: {
        properties: {
          message: {
            type: 'text',
          },
          timestamp: {
            type: 'date',
          },
          tags: {
            type: 'keyword',
          },
        },
      },
    },
  },
  {
    name: 'create-index-with-complex-mappings',
    type: 'elasticsearch.indices.create',
    with: {
      index: 'test-index',
      mappings: {
        properties: {
          commit: {
            properties: {
              message: {
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: {
                    type: 'keyword',
                    ignore_above: 512,
                  },
                },
              },
              author: {
                properties: {
                  date: {
                    type: 'date',
                    format: 'strict_date_optional_time||epoch_millis',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    name: 'create-index-with-settings-and-aliases',
    type: 'elasticsearch.indices.create',
    with: {
      index: 'test-index-full',
      mappings: {
        dynamic: 'strict',
        properties: {
          title: {
            type: 'text',
            analyzer: 'english',
          },
          content: {
            type: 'text',
          },
          author: {
            type: 'keyword',
          },
          published_date: {
            type: 'date',
          },
          views: {
            type: 'integer',
          },
          location: {
            type: 'geo_point',
          },
        },
      },
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        refresh_interval: '5s',
      },
      aliases: {
        'test-alias': {},
        'test-alias-filtered': {
          filter: {
            term: { author: 'admin' },
          },
          routing: 'admin',
        },
      },
      timeout: '30s',
      wait_for_active_shards: 1,
    },
  },
  {
    name: 'delete-index',
    type: 'elasticsearch.indices.delete',
    with: {
      index: 'test-index',
    },
  },
  {
    name: 'delete-index-with-params',
    type: 'elasticsearch.indices.delete',
    with: {
      index: 'test-index-*',
      timeout: '1m',
      master_timeout: '30s',
      ignore_unavailable: true,
      allow_no_indices: true,
    },
  },
  {
    name: 'exists-index',
    type: 'elasticsearch.indices.exists',
    with: {
      index: 'test-index',
    },
  },
  {
    name: 'exists-index-with-params',
    type: 'elasticsearch.indices.exists',
    with: {
      index: 'test-index-*',
      allow_no_indices: false,
      expand_wildcards: 'open',
      ignore_unavailable: true,
    },
  },
  // Bulk operations
  {
    name: 'bulk',
    type: 'elasticsearch.bulk',
    with: {
      index: 'test-index',
      operations: [
        { index: { _index: 'test', _id: '1' } },
        { field1: 'value1' },
        { delete: { _index: 'test', _id: '2' } },
        { create: { _index: 'test', _id: '3' } },
        { field1: 'value3' },
        { update: { _id: '1', _index: 'test' } },
        { doc: { field2: 'value2' } },
      ],
    },
  },
  {
    name: 'bulk-with-params',
    type: 'elasticsearch.bulk',
    with: {
      index: 'test-index',
      operations: [
        { index: { _id: '10', routing: 'user1' } },
        {
          title: 'Document 10',
          content: 'Content for document 10',
          timestamp: '2024-01-01T00:00:00Z',
        },
        { index: { _id: '11', routing: 'user1' } },
        {
          title: 'Document 11',
          content: 'Content for document 11',
          timestamp: '2024-01-02T00:00:00Z',
        },
        { update: { _id: '10', routing: 'user1' } },
        { doc: { views: 100 }, doc_as_upsert: true },
        { delete: { _id: 'old-doc', routing: 'user1' } },
      ],
      refresh: 'wait_for',
      routing: 'user1',
      timeout: '5m',
      pipeline: 'my-ingest-pipeline',
      require_alias: false,
    },
  },
];

export const ES_INVALID_SAMPLE_STEPS = [
  {
    step: {
      name: 'create-index-with-invalid-mappings',
      type: 'elasticsearch.indices.create',
      with: {
        index: 'test-index',
        mappings: {
          properties: [],
        },
      },
    },
    zodErrorMessage: 'Invalid input: expected record, received array',
    diagnosticErrorMessage: /Incorrect type\. Expected "object"\./,
  },
  {
    step: {
      name: 'create-document-with-extra-field',
      type: 'elasticsearch.index',
      with: {
        index: 'test-index',
        id: '1111-aaaa-bbbb-cccc-1234567890ab',
        document: {
          message: 'test',
        },
        notValidField: {},
      },
    },
    zodErrorMessage: '"Unrecognized key:',
    diagnosticErrorMessage: 'DisallowedExtraPropWarning',
  },
];
