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

/**
 * Registers the index editor analytics events.
 * This function is wrapped in `once` to ensure that the events are registered only once.
 */
export const registerESQLEditorAnalyticsEvents = once((analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType({
    eventType: ESQL_LOOKUP_JOIN_ACTION_SHOWN,
    schema: {
      trigger_action: {
        type: 'keyword',
        _meta: {
          description: 'The lookup index action shown. Possible values are: create|view|edit',
        },
      },
      trigger_source: {
        type: 'keyword',
        _meta: {
          description:
            'The way how the index editor action has been triggered. Possible values are: esql_hover|esql_autocomplete',
        },
      },
      privilege_kind: {
        type: 'keyword',
        _meta: {
          description: 'User privileges. Possible values are: write|read_view_metadata|create_only',
        },
      },
    },
  });
});
