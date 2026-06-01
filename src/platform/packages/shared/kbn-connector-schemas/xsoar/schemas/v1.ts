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

export const ConfigSchema = lazySchema(() =>
  z
    .object({
      url: z.string(),
    })
    .strict()
);

export const SecretsSchema = lazySchema(() =>
  z
    .object({
      apiKey: z.string(),
      apiKeyID: z.string().nullable().default(null),
    })
    .strict()
);

export const XSOARPlaybooksActionParamsSchema = null;
export const XSOARPlaybooksObjectSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    name: z.string(),
  })
);
export const XSOARPlaybooksActionResponseSchema = lazySchema(() =>
  z.object({
    playbooks: z.array(XSOARPlaybooksObjectSchema),
  })
);

export const XSOARRunActionParamsSchema = lazySchema(() =>
  z
    .object({
      name: z.string(),
      playbookId: z.string().nullable().default(null),
      createInvestigation: z.boolean(),
      severity: z.coerce.number(),
      isRuleSeverity: z.boolean().default(false).nullable(),
      body: z.string().nullable().default(null),
    })
    .strict()
);
export const XSOARRunActionResponseSchema = lazySchema(() => z.object({}));

export const ExecutorParamsSchema = lazySchema(() =>
  z.union([
    z
      .object({
        subAction: z.literal(SUB_ACTION.PLAYBOOKS),
        subActionParams: z.literal(null), // this subaction not required any value as params
      })
      .strict(),
    z
      .object({
        subAction: z.literal(SUB_ACTION.RUN),
        subActionParams: XSOARRunActionParamsSchema,
      })
      .strict(),
  ])
);
