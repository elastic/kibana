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
});
