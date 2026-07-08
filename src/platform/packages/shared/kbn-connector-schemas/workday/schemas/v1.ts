/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { SUB_ACTION } from '../constants';

export const WorkdayConfigSchema = lazySchema(() =>
  z
    .object({
      apiUrl: z.string(),
      tokenUrl: z.string(),
    })
    .strict()
);

export const WorkdaySecretsSchema = lazySchema(() =>
  z
    .object({
      clientId: z.string(),
      clientSecret: z.string(),
    })
    .strict()
);

export const WorkdayApiDoNotValidateResponsesSchema = lazySchema(() => z.any());

export const WorkdayGetTokenResponseSchema = lazySchema(() =>
  z
    .object({
      access_token: z.string(),
      expires_in: z.coerce.number(),
      token_type: z.string(),
      scope: z.string().optional(),
      refresh_token: z.string().optional(),
    })
    .passthrough()
);

export const WorkdayGetWorkerParamsSchema = lazySchema(() =>
  z
    .object({
      workerId: z.string().min(1),
    })
    .strict()
);

export const WorkdaySearchWorkersParamsSchema = lazySchema(() =>
  z
    .object({
      search: z.string().min(3),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    })
    .strict()
);

const WorkerRefSchema = z
  .object({
    id: z.string().optional(),
    descriptor: z.string().optional(),
    href: z.string().optional(),
  })
  .passthrough();

const WorkerSchema = z
  .object({
    id: z.string().optional(),
    descriptor: z.string().optional(),
    href: z.string().optional(),
    primaryWorkEmail: z.string().optional(),
    businessTitle: z.string().optional(),
    primarySupervisoryOrganization: WorkerRefSchema.optional(),
    primaryJob: WorkerRefSchema.optional(),
  })
  .passthrough();

export const WorkdayGetWorkerResponseSchema = lazySchema(() => WorkerSchema);

export const WorkdaySearchWorkersResponseSchema = lazySchema(() =>
  z
    .object({
      total: z.coerce.number().optional(),
      data: z.array(WorkerSchema).optional(),
    })
    .passthrough()
);

export const WorkdayActionParamsSchema = lazySchema(() =>
  z.discriminatedUnion('subAction', [
    z
      .object({
        subAction: z.literal(SUB_ACTION.GET_WORKER),
        subActionParams: WorkdayGetWorkerParamsSchema,
      })
      .strict(),
    z
      .object({
        subAction: z.literal(SUB_ACTION.SEARCH_WORKERS),
        subActionParams: WorkdaySearchWorkersParamsSchema,
      })
      .strict(),
  ])
);
