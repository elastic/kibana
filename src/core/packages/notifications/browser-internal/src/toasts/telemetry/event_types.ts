/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type RootSchema, type EventTypeOpts } from '@elastic/ebt/client';

export enum EventMetric {
  TOAST_DISMISSED = 'global_toast_list_toast_dismissed',
}

export enum FieldType {
  RECURRENCE_COUNT = 'toast_deduplication_count',
  TOAST_MESSAGE = 'toast_message',
  TOAST_MESSAGE_TYPE = 'toast_message_type',
}

const fields: Record<FieldType, RootSchema<Record<string, unknown>>> = {
  [FieldType.TOAST_MESSAGE]: {
    [FieldType.TOAST_MESSAGE]: {
      type: 'keyword',
      _meta: {
        description: 'toast message text',
        optional: false,
      },
    },
  },
  [FieldType.RECURRENCE_COUNT]: {
    [FieldType.RECURRENCE_COUNT]: {
      type: 'long',
      _meta: {
        description: 'recurrence count for particular toast message',
        optional: false,
      },
    },
  },
  [FieldType.TOAST_MESSAGE_TYPE]: {
    [FieldType.TOAST_MESSAGE_TYPE]: {
      type: 'keyword',
      _meta: {
        description: 'toast message type',
        optional: false,
      },
    },
  },
};

export const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: EventMetric.TOAST_DISMISSED,
    schema: {
      ...fields[FieldType.TOAST_MESSAGE],
      ...fields[FieldType.RECURRENCE_COUNT],
      ...fields[FieldType.TOAST_MESSAGE_TYPE],
    },
  },
];
