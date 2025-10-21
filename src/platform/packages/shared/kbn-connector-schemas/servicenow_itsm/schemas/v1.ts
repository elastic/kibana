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
  CommentsSchema,
  CommonAttributes,
  ExecutorSubActionCloseIncidentParamsSchema,
  ExecutorSubActionCommonFieldsParamsSchema,
  ExecutorSubActionGetChoicesParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
} from '@kbn/connector-schemas/servicenow';

export const ExecutorSubActionPushParamsSchemaITSM = z
  .object({
    incident: z
      .object({
        ...CommonAttributes,
        severity: z.string().nullable().default(null),
        urgency: z.string().nullable().default(null),
        impact: z.string().nullable().default(null),
      })
      .strict(),
    comments: CommentsSchema,
  })
  .strict();

export const ExecutorParamsSchemaITSM = z.discriminatedUnion('subAction', [
  z
    .object({
      subAction: z.literal('getFields'),
      subActionParams: ExecutorSubActionCommonFieldsParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('getIncident'),
      subActionParams: ExecutorSubActionGetIncidentParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('handshake'),
      subActionParams: ExecutorSubActionHandshakeParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('pushToService'),
      subActionParams: ExecutorSubActionPushParamsSchemaITSM,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('getChoices'),
      subActionParams: ExecutorSubActionGetChoicesParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('closeIncident'),
      subActionParams: ExecutorSubActionCloseIncidentParamsSchema,
    })
    .strict(),
]);
