/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RootSchema } from '@kbn/analytics-client';
import { EventTypeOpts } from '@kbn/core/public';

export enum EventMetric {
  TOAST_DISMISSED = 'toast_dismissed',
  ALL_TOASTS_DISMISSED = 'all_toasts_dismissed',
}

export enum FieldType {
  RECURRENCE_COUNT = 'recurrence_count',
  TOAST_MESSAGE = 'toast_message',
}

const fields: Record<FieldType, RootSchema<Record<string, unknown>>> = {
  [FieldType.TOAST_MESSAGE]: {
    [FieldType.TOAST_MESSAGE]: {
      type: 'text',
      _meta: {
        description: 'toast mesaage text',
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
};

export const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: EventMetric.TOAST_DISMISSED,
    schema: {
      ...fields[FieldType.TOAST_MESSAGE],
      ...fields[FieldType.RECURRENCE_COUNT],
    },
  },
  {
    eventType: EventMetric.ALL_TOASTS_DISMISSED,
    schema: {
      items: {
        properties: {
          ...fields[FieldType.TOAST_MESSAGE],
          ...fields[FieldType.RECURRENCE_COUNT],
        },
      },
    },
  },
];
