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
  ExecutorSubActionCommonFieldsParamsSchema,
  ExecutorSubActionGetChoicesParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
} from '../../servicenow';

// Schema for ServiceNow Security Incident Response (SIR)
export const ExecutorSubActionPushParamsSchemaSIR = z
  .object({
    incident: z
      .object({
        ...CommonAttributes,
        dest_ip: z
          .union([
            z.string().nullable().default(null),
            z.array(z.string()).nullable().default(null),
          ])
          .default(null),
        malware_hash: z
          .union([
            z.string().nullable().default(null),
            z.array(z.string()).nullable().default(null),
          ])
          .default(null),
        malware_url: z
          .union([
            z.string().nullable().default(null),
            z.array(z.string()).nullable().default(null),
          ])
          .default(null),
        source_ip: z
          .union([
            z.string().nullable().default(null),
            z.array(z.string()).nullable().default(null),
          ])
          .default(null),
        priority: z.string().nullable().default(null),
      })
      .strict(),
    comments: CommentsSchema,
  })
  .strict();

// Executor parameters for ServiceNow Security Incident Response (SIR)
export const ExecutorParamsSchemaSIR = z.discriminatedUnion('subAction', [
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
      subActionParams: ExecutorSubActionPushParamsSchemaSIR,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('getChoices'),
      subActionParams: ExecutorSubActionGetChoicesParamsSchema,
    })
    .strict(),
]);
