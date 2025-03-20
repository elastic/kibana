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
  INTERCEPT_INTERACTION = 'intercept_interaction',
  INTERCEPT_REGISTRATION = 'intercept_registration',
}

export enum EventFieldType {
  INTERACTION_TYPE = 'interaction_type',
  INTERCEPT_TITLE = 'intercept_title',
}

const fields: Record<EventFieldType, RootSchema<unknown>> = {
  [EventFieldType.INTERACTION_TYPE]: {
    [EventFieldType.INTERACTION_TYPE]: {
      type: 'keyword',
      _meta: {
        description: 'The type of interaction that occurred with the intercept',
        optional: false,
      },
    },
  },
  [EventFieldType.INTERCEPT_TITLE]: {
    [EventFieldType.INTERCEPT_TITLE]: {
      type: 'keyword',
      _meta: {
        description: 'Title of the intercept',
        optional: false,
      },
    },
  },
};

/**
 * @description defines all the event types that can be reported by the product intercept dialog,
 * with the mapping that values provided will be ingested as within EBT
 */
export const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: EventMetric.INTERCEPT_INTERACTION,
    schema: {
      ...fields[EventFieldType.INTERACTION_TYPE],
      ...fields[EventFieldType.INTERCEPT_TITLE],
    },
  },
  {
    eventType: EventMetric.INTERCEPT_REGISTRATION,
    schema: {
      ...fields[EventFieldType.INTERCEPT_TITLE],
    },
  },
];
