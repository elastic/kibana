/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';

const RunSubActionParamsSchema = z.object({
  workflowId: z.string(),
  inputs: z.any().optional(),
  spaceId: z.string(),
  summaryMode: z.boolean().optional().default(true),
});

// Schema for rule configuration (what the UI saves)
export const WorkflowsRuleActionParamsSchema = schema.object({
  subAction: schema.literal('run'),
  subActionParams: schema.object({
    workflowId: schema.string(),
    inputs: schema.maybe(schema.any()),
    summaryMode: schema.maybe(schema.boolean()),
  }),
});

// Schema for execution (what the executor receives)
export const ExecutorParamsSchema = z
  .object({
    subAction: z.literal('run'),
    subActionParams: RunSubActionParamsSchema,
  })
  .strict();

export const ExecutorSubActionRunParamsSchema = RunSubActionParamsSchema;
