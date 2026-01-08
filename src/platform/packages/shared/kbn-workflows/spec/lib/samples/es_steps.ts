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
export const ES_VALID_SAMPLE_STEPS = [
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
  // indices
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
    name: 'delete-index',
    type: 'elasticsearch.indices.delete',
    with: {
      index: 'test-index',
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
