/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { ForEachStepSchema, WorkflowRetrySchema } from '../../../spec/schema';

export const EnterForeachNodeSchema = z.object({
  id: z.string(),
  type: z.literal('enter-foreach'),
  itemNodeIds: z.array(z.string()),
  exitNodeId: z.string(),
  configuration: ForEachStepSchema.omit({
    steps: true,
  }),
});

export type EnterForeachNode = z.infer<typeof EnterForeachNodeSchema>;

export const ExitForeachNodeSchema = z.object({
  id: z.string(),
  type: z.literal('exit-foreach'),
  startNodeId: z.string(),
});

export type ExitForeachNode = z.infer<typeof ExitForeachNodeSchema>;

export const EnterRetryNodeSchema = z.object({
  id: z.string(),
  type: z.literal('enter-retry'),
  exitNodeId: z.string(),
  configuration: WorkflowRetrySchema,
});
export type EnterRetryNode = z.infer<typeof EnterRetryNodeSchema>;

export const ExitRetryNodeSchema = z.object({
  id: z.string(),
  type: z.literal('exit-retry'),
  startNodeId: z.string(),
});
export type ExitRetryNode = z.infer<typeof ExitRetryNodeSchema>;
