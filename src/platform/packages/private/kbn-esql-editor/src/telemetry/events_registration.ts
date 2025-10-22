/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { once } from 'lodash';

/**
 * Event types.
 */
export const ESQL_LOOKUP_JOIN_ACTION_SHOWN = 'esql.lookup_action_shown';
export const ESQL_SUGGESTIONS_WITH_CUSTOM_COMMAND_SHOWN =
  'esql.suggestions_with_custom_command_shown';
export const ESQL_QUERY_HISTORY_OPENED = 'esql.query_history_opened';
export const ESQL_QUERY_HISTORY_CLICKED = 'esql.query_history_clicked';
export const ESQL_STARRED_QUERY_CLICKED = 'esql.starred_query_clicked';
export const ESQL_QUERY_SUBMITTED = 'esql.query_submitted';

/**
 * Registers the esql editor analytics events.
 * This function is wrapped in `once` to ensure that the events are registered only once.
 */
export const registerESQLEditorAnalyticsEvents = once((analytics: AnalyticsServiceSetup) => {
  // Triggered when a Lookup Join index editor actions is shown to the user inside the ES|QL editor.
  analytics.registerEventType({
    eventType: ESQL_LOOKUP_JOIN_ACTION_SHOWN,
    schema: {
      trigger_action: {
        type: 'keyword',
        _meta: {
          description: 'The lookup index action shown. Possible values are: create|edit|read',
        },
      },
      trigger_source: {
        type: 'keyword',
        _meta: {
          description:
            'The way how the index editor action has been triggered. Possible values are: esql_hover|esql_autocomplete',
        },
      },
      highest_privilege: {
        type: 'keyword',
        _meta: {
          description:
            'The higher privilege the user has for this index. Possible values are: create|edit|read',
        },
      },
    },
  });
  analytics.registerEventType({
    eventType: ESQL_SUGGESTIONS_WITH_CUSTOM_COMMAND_SHOWN,
    schema: {
      command_ids: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description: 'The command id attached to the suggestion item',
          },
        },
        _meta: {
          description: 'List of commands ids suggested',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: ESQL_QUERY_HISTORY_OPENED,
    schema: {},
  });
  analytics.registerEventType({
    eventType: ESQL_QUERY_HISTORY_CLICKED,
    schema: {},
  });
  analytics.registerEventType({
    eventType: ESQL_STARRED_QUERY_CLICKED,
    schema: {},
  });
  analytics.registerEventType({
    eventType: ESQL_QUERY_SUBMITTED,
    schema: {
      query_source: {
        type: 'keyword',
        _meta: {
          description:
            'The source of the execution. Possible values are: manual|help|history|starred',
        },
      },
      query_length: {
        type: 'keyword',
        _meta: { description: 'The length of the query.' },
      },
      query_lines: {
        type: 'keyword',
        _meta: { description: 'The number of lines in the query.' },
      },
      anti_limit_before_aggregate: {
        type: 'boolean',
        _meta: { description: 'Whether the query had a LIMIT before the aggregation.' },
      },
      anti_missing_sort_before_limit: {
        type: 'boolean',
        _meta: { description: 'Whether the query was missing a SORT before a LIMIT.' },
      },
    },
  });
});
