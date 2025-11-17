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
export const INDEX_EDITOR_FLYOUT_OPENED_EVENT_TYPE = 'index_editor.flyout_opened';
export const INDEX_EDITOR_SAVE_SUBMITTED_EVENT_TYPE = 'index_editor.save_submitted';
export const INDEX_EDITOR_DATA_INTERACTION_EVENT_TYPE = 'index_editor.data_interaction';
export const INDEX_EDITOR_CLICK_QUERY_THIS_INDEX_EVENT_TYPE =
  'index_editor.query_this_index_clicked';
export const INDEX_EDITOR_DROP_ALL_COLUMNS_EVENT_TYPE = 'index_editor.drop_all_columns';

/**
 * Registers the index editor analytics events.
 * This function is wrapped in `once` to ensure that the events are registered only once.
 */
export const registerIndexEditorAnalyticsEvents = once((analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType({
    eventType: INDEX_EDITOR_FLYOUT_OPENED_EVENT_TYPE,
    schema: {
      flyout_mode: {
        type: 'keyword',
        _meta: {
          description:
            'The mode in which the index editor flyout was opened. Possible values are: create|view|edit',
        },
      },
      trigger_source: {
        type: 'keyword',
        _meta: {
          description:
            'The way how the index editor flyout has been triggered. Possible values are: esql_hover|esql_autocomplete',
        },
      },
      doc_count_bucket: {
        type: 'keyword',
        _meta: {
          description:
            'The bucket in which the document count of the index falls into. Possible values are: 0|1-100|101-10k|10k+',
        },
      },
      field_count_bucket: {
        type: 'keyword',
        _meta: {
          description:
            'The bucket in which the field count of the index falls into. Possible values are: 0|1-4|5-20|20+',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: INDEX_EDITOR_SAVE_SUBMITTED_EVENT_TYPE,
    schema: {
      flyout_mode: {
        type: 'keyword',
        _meta: {
          description:
            'The mode in which the index editor flyout was opened. Possible values are: create|view|edit',
        },
      },
      pending_rows_added: {
        type: 'integer',
        _meta: {
          description: 'The number of rows added in the index editor before saving',
        },
      },
      pending_cols_added: {
        type: 'integer',
        _meta: {
          description: 'The number of columns added in the index editor before saving',
        },
      },
      pending_cells_edited: {
        type: 'integer',
        _meta: {
          description: 'The number of cells edited in the index editor before saving',
        },
      },
      action: {
        type: 'keyword',
        _meta: {
          description:
            'The action taken when submitting the save. Possible values are: save|save_and_exit',
        },
      },
      outcome: {
        type: 'keyword',
        _meta: {
          description: 'The outcome of the save action. Possible values are: success|error',
        },
      },
      exec_latency_bucket: {
        type: 'keyword',
        _meta: {
          description: 'The latency of the save action in buckets',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: INDEX_EDITOR_DATA_INTERACTION_EVENT_TYPE,
    schema: {
      flyout_mode: {
        type: 'keyword',
        _meta: {
          description:
            'The mode in which the index editor flyout was opened. Possible values are: create|edit',
        },
      },
      action_type: {
        type: 'keyword',
        _meta: {
          description:
            'The type of edit operation performed in the index editor. Possible values are: edit_cell|edit_column|add_row|add_column|delete_row|delete_column',
        },
      },
      failure_reason: {
        type: 'keyword',
        _meta: {
          optional: true,
          description: 'The reason for a validation failure in the index editor.',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: INDEX_EDITOR_CLICK_QUERY_THIS_INDEX_EVENT_TYPE,
    schema: {
      flyout_mode: {
        type: 'keyword',
        _meta: {
          description:
            'The mode in which the index editor flyout was opened. Possible values are: create|view|edit',
        },
      },
      search_query_length_bucket: {
        type: 'keyword',
        _meta: {
          description:
            'The bucket in which the length of the query in the search bar falls into. Possible values are: 0|1-50|51-100|101-200|200+',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: INDEX_EDITOR_DROP_ALL_COLUMNS_EVENT_TYPE,
    schema: {
      flyout_mode: {
        type: 'keyword',
        _meta: {
          description:
            'The mode in which the index editor flyout was opened. Possible values are: create|edit',
        },
      },
      outcome: {
        type: 'keyword',
        _meta: {
          description: 'The outcome of the action. Possible values are: success|error',
        },
      },
    },
  });
});
