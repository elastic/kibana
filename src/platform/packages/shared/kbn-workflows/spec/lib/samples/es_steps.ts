/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ES_VALID_SAMPLE_STEPS = [
  {
    name: 'create-document',
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
    name: 'create-document',
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
    name: 'delete-document',
    type: 'elasticsearch.delete',
    with: {
      index: 'test-index',
      id: '1',
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
    name: 'delete-index',
    type: 'elasticsearch.indices.delete',
    with: {
      index: 'test-index',
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
    diagnosticErrorMessage: /Incorrect type\. Expected "__schema\d+"\./,
  },
];
