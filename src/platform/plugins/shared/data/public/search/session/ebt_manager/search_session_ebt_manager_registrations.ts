/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, SchemaValue } from '@kbn/core/public';
import {
  BG_SEARCH_CANCEL,
  BG_SEARCH_COMPLETE,
  BG_SEARCH_ERROR,
  BG_SEARCH_LIST_VIEW,
  BG_SEARCH_OPEN,
  BG_SEARCH_START,
} from './constants';

const COMMON_SCHEMA: Record<string, SchemaValue<unknown>> = {
  query_lang: {
    type: 'keyword',
    _meta: { description: 'The query language used in the search (e.g., KQL, Lucene, DSL).' },
  },
  session_id: {
    type: 'keyword',
    _meta: { description: 'The unique identifier for the search session.' },
  },
};

export const registerSearchSessionEBTManagerAnalytics = (core: CoreSetup) => {
  core.analytics.registerEventType({
    eventType: BG_SEARCH_START,
    schema: {
      query_lang: COMMON_SCHEMA.query_lang,
      session_id: COMMON_SCHEMA.session_id,
      entry_point: {
        type: 'keyword',
        _meta: { description: 'The entry point used to start the background search.' },
      },
      query_chars_bucket: {
        type: 'integer',
        _meta: {
          description:
            'A bucketed representation of the number of characters in the search query (e.g., 0-50, 51-100).',
        },
      },
      query_lines_bucket: {
        type: 'integer',
        _meta: {
          description:
            'A bucketed representation of the number of lines in the search query (e.g., 1, 2-5, 6-10).',
        },
      },
    },
  });

  core.analytics.registerEventType({
    eventType: BG_SEARCH_COMPLETE,
    schema: {
      query_lang: COMMON_SCHEMA.query_lang,
      session_id: COMMON_SCHEMA.session_id,
      runtime_ms: {
        type: 'integer',
        _meta: {
          description: 'The total time taken to complete the background search in milliseconds.',
        },
      },
      result_rows_bucket: {
        type: 'integer',
        _meta: {
          description:
            'A bucketed representation of the number of rows returned by the search (e.g., 0-100, 101-500).',
        },
      },
      result_bytes_bucket: {
        type: 'integer',
        _meta: {
          description:
            'A bucketed representation of the size of the search results in bytes (e.g., 0-1KB, 1KB-10KB).',
        },
      },
    },
  });

  core.analytics.registerEventType({
    eventType: BG_SEARCH_ERROR,
    schema: {
      query_lang: COMMON_SCHEMA.query_lang,
      session_id: COMMON_SCHEMA.session_id,
      error_type: {
        type: 'keyword',
        _meta: {
          description: 'The type of error that occurred during the background search.',
        },
      },
      http_status: {
        type: 'integer',
        _meta: {
          description: 'The HTTP status code returned by the search request.',
        },
      },
    },
  });

  core.analytics.registerEventType({
    eventType: BG_SEARCH_CANCEL,
    schema: {
      query_lang: COMMON_SCHEMA.query_lang,
      session_id: COMMON_SCHEMA.session_id,
      cancel_source: {
        type: 'keyword',
        _meta: { description: 'The source that initiated the cancellation (e.g., user, system).' },
      },
    },
  });

  core.analytics.registerEventType({
    eventType: BG_SEARCH_OPEN,
    schema: {
      query_lang: COMMON_SCHEMA.query_lang,
      session_id: COMMON_SCHEMA.session_id,
      status: {
        type: 'keyword',
        _meta: { description: 'The current status of the search session.' },
      },
      resume_source: {
        type: 'keyword',
        _meta: {
          description: 'The source from which the background search session was resumed.',
        },
      },
    },
  });

  core.analytics.registerEventType({
    eventType: BG_SEARCH_LIST_VIEW,
    schema: {
      entry_point: {
        type: 'keyword',
        _meta: { description: 'The entry point used to access the background search list view.' },
      },
    },
  });
};
