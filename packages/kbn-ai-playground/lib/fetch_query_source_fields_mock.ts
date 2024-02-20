/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const ELSER_PASSAGE_CHUNKED_TWO_INDICES = {
  indices: ['workplace_index', 'workplace_index2'],
  fields: {
    'vector.tokens': {
      rank_features: {
        type: 'rank_features',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    metadata: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'metadata.rolePermissions.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.name.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.summary': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'content_vector.tokens': {
      rank_features: {
        type: 'rank_features',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    content: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    'vector.model_id': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'content.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'content_vector.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'metadata.summary.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'vector.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    content_vector: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    'metadata.rolePermissions': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'content_vector.model_id': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    vector: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'text.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    text: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'metadata.name': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
  },
};
