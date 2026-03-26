/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { GraphNodeSchema } from './base';
import { IfStepSchema } from '../../../spec/schema';

export const EnterIfNodeConfigurationSchema = IfStepSchema.omit({
  steps: true,
  else: true,
});

export const EnterIfNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-if'),
  exitNodeId: z.string(),
  configuration: EnterIfNodeConfigurationSchema,
});
export type EnterIfNode = z.infer<typeof EnterIfNodeSchema>;

export const EnterConditionBranchNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.union([z.literal('enter-then-branch'), z.literal('enter-else-branch')]),
  condition: z.union([z.string(), z.undefined()]).optional(),
});
export type EnterConditionBranchNode = z.infer<typeof EnterConditionBranchNodeSchema>;

export const ExitConditionBranchNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.union([z.literal('exit-then-branch'), z.literal('exit-else-branch')]),
  startNodeId: z.string(),
});
export type ExitConditionBranchNode = z.infer<typeof ExitConditionBranchNodeSchema>;

export const ExitIfNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-if'),
  startNodeId: z.string(),
});

export type ExitIfNode = z.infer<typeof ExitIfNodeSchema>;
