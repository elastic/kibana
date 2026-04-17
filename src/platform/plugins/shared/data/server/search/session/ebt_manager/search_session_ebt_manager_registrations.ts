/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { BG_SEARCH_COMPLETE, BG_SEARCH_ERROR } from './constants';

const commonSchema = {
  app_id: {
    type: 'keyword',
    _meta: { description: 'The app ID where the search session was created.' },
  },
  session_id: {
    type: 'keyword',
    _meta: { description: 'The unique identifier for the background search session.' },
  },
  query_lang: {
    type: 'keyword',
    _meta: { description: 'The query language used in the background search.' },
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
} as const;

export const registerSearchSessionEBTManagerAnalytics = (core: CoreSetup) => {
  core.analytics.registerEventType({
    eventType: BG_SEARCH_COMPLETE,
    schema: {
      ...commonSchema,
      runtime_ms: {
        type: 'long',
        _meta: {
          description: 'Total time from search start to completion in milliseconds.',
        },
      },
    },
  });

  core.analytics.registerEventType({
    eventType: BG_SEARCH_ERROR,
    schema: {
      ...commonSchema,
      error_type: {
        type: 'text',
        _meta: { description: 'The error messages returned by the failed background searches.' },
      },
      http_status: {
        type: 'integer',
        _meta: { description: 'HTTP status code associated with the failed background searches.' },
      },
    },
  });
};
