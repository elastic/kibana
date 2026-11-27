/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventTypeOpts } from '@elastic/ebt/client';
import type { ESQLStatsQueryMetaExclusionReason } from '@kbn/esql-utils';

export const CASCADE_EVENT_TYPE = 'discover_cascade';

export enum CascadeEventName {
  EXPANDED = 'cascaded_documents_expanded',
  COLLAPSED = 'cascaded_documents_collapsed',
  OPT_OUT = 'cascaded_documents_opt_out',
  OPEN_IN_NEW_TAB_CLICKED = 'cascaded_documents_open_in_new_tab_clicked',
  /**
   * The query describes a cascade we deliberately don't support,
   * so the experience was withheld from the user.
   */
  UNSUPPORTED_QUERY = 'cascaded_documents_unsupported_query',
}

/**
 * The reasons `getESQLStatsQueryMeta` withholds cascade metadata for that are worth reporting.
 *
 * Most reasons simply mean the query does not describe a grouping, which is the common case and
 * carries no signal. These are the ones where the user asked for something the cascade experience
 * cannot serve yet, so their volume tells us what to invest in next.
 *
 * The reasons are spelled out rather than referenced off `ESQL_STATS_QUERY_META_EXCLUSION_REASON`,
 * so this module carries no runtime import of `@kbn/esql-utils`. The union type still rejects a
 * value that is not one of the reasons the helper reports.
 */
export const TRACKED_CASCADE_EXCLUSION_REASONS = new Set<ESQLStatsQueryMetaExclusionReason>([
  'timeseries_multiple_stats',
  'timeseries_stats_in_fork',
  'group_field_renamed_after_stats',
]);

export enum CascadeEventDataKeys {
  CASCADE_EVENT_NAME = 'eventName',
  TAB_ID = 'tabId',
  NODE_ID = 'nodeId',
  EXCLUSION_REASON = 'exclusionReason',
}

export interface CascadeEBTEvent {
  [CascadeEventDataKeys.CASCADE_EVENT_NAME]: CascadeEventName;
  [CascadeEventDataKeys.TAB_ID]: string;
  [CascadeEventDataKeys.NODE_ID]?: string;
  [CascadeEventDataKeys.EXCLUSION_REASON]?: ESQLStatsQueryMetaExclusionReason;
}

export const cascadeEventType: EventTypeOpts<Record<string, unknown>> = {
  eventType: CASCADE_EVENT_TYPE,
  schema: {
    [CascadeEventDataKeys.CASCADE_EVENT_NAME]: {
      type: 'keyword',
      _meta: {
        description: 'The cascade action that occurred',
        optional: false,
      },
    },
    [CascadeEventDataKeys.TAB_ID]: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the tab where the cascade interaction occurred',
        optional: false,
      },
    },
    [CascadeEventDataKeys.NODE_ID]: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the node that was expanded',
        optional: true,
      },
    },
    [CascadeEventDataKeys.EXCLUSION_REASON]: {
      type: 'keyword',
      _meta: {
        description:
          'Why the cascade experience was withheld for the query, reported with the "cascaded_documents_unsupported_query" event',
        optional: true,
      },
    },
  },
};
