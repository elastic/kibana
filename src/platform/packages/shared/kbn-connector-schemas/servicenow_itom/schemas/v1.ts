/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';
import {
  DEFAULT_ALERTS_GROUPING_KEY,
  ExecutorSubActionGetChoicesParamsSchema,
} from '../../servicenow';

export const ExecutorSubActionAddEventParamsSchema = z
  .object({
    source: z.string().nullable().default(null),
    event_class: z.string().nullable().default(null),
    resource: z.string().nullable().default(null),
    node: z.string().nullable().default(null),
    metric_name: z.string().nullable().default(null),
    type: z.string().nullable().default(null),
    severity: z.string().nullable().default(null),
    description: z.string().nullable().default(null),
    additional_info: z.string().nullable().default(null),
    message_key: z.string().nullable().default(DEFAULT_ALERTS_GROUPING_KEY),
    time_of_event: z.string().nullable().default(null),
  })
  .strict();

export const ExecutorParamsSchemaITOM = z.discriminatedUnion('subAction', [
  z
    .object({
      subAction: z.literal('addEvent'),
      subActionParams: ExecutorSubActionAddEventParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('getChoices'),
      subActionParams: ExecutorSubActionGetChoicesParamsSchema,
    })
    .strict(),
]);
