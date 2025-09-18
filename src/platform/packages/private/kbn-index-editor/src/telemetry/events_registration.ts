/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';

/**
 * Event types.
 */
export const INDEX_EDITOR_FLYOUT_OPENED_EVENT_TYPE = 'index_editor.flyout_opened';
export const INDEX_EDITOR_SAVE_SUBMITTED_EVENT_TYPE = 'index_editor.save_submitted';

export const registerIndexEditorAnalyticsEvents = (analytics: AnalyticsServiceSetup) => {
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
      invocation_source: {
        type: 'keyword',
        _meta: {
          description:
            'The source from which the index editor flyout was invoked. Possible values are: esql_hover|esql_autocomplete',
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
};
