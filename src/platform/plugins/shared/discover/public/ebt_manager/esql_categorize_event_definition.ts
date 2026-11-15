/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventTypeOpts } from '@elastic/ebt/client';

export const ESQL_CATEGORIZE_EVENT_TYPE = 'discover_esql_categorize';

export enum EsqlCategorizeEventName {
  GROUP_SIMILAR_MESSAGES_CLICKED = 'group_similar_messages_clicked',
}

export enum EsqlCategorizeEventDataKeys {
  EVENT_NAME = 'eventName',
  FIELD_NAME = 'fieldName',
}

export interface EsqlCategorizeEBTEvent {
  [EsqlCategorizeEventDataKeys.EVENT_NAME]: EsqlCategorizeEventName;
  [EsqlCategorizeEventDataKeys.FIELD_NAME]: string;
}

export const esqlCategorizeEventType: EventTypeOpts<Record<string, unknown>> = {
  eventType: ESQL_CATEGORIZE_EVENT_TYPE,
  schema: {
    [EsqlCategorizeEventDataKeys.EVENT_NAME]: {
      type: 'keyword',
      _meta: {
        description: 'The ES|QL categorize action that occurred',
        optional: false,
      },
    },
    [EsqlCategorizeEventDataKeys.FIELD_NAME]: {
      type: 'keyword',
      _meta: {
        description: 'The name of the field that was categorized',
        optional: false,
      },
    },
  },
};
