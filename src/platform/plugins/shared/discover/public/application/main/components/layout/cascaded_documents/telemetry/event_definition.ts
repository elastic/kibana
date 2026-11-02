/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventTypeOpts } from '@elastic/ebt/client';

export const CASCADE_EVENT_TYPE = 'discover_cascade';

export enum CascadeEventName {
  EXPANDED = 'cascaded_documents_expanded',
  COLLAPSED = 'cascaded_documents_collapsed',
  OPT_OUT = 'cascaded_documents_opt_out',
  OPEN_IN_NEW_TAB_CLICKED = 'cascaded_documents_open_in_new_tab_clicked',
}

export enum CascadeEventDataKeys {
  CASCADE_EVENT_NAME = 'eventName',
  TAB_ID = 'tabId',
  NODE_ID = 'nodeId',
}

export interface CascadeEBTEvent {
  [CascadeEventDataKeys.CASCADE_EVENT_NAME]: CascadeEventName;
  [CascadeEventDataKeys.TAB_ID]: string;
  [CascadeEventDataKeys.NODE_ID]?: string;
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
  },
};
