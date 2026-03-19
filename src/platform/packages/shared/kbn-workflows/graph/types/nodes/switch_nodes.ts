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
import { SwitchStepSchema } from '../../../spec/schema';

export const EnterSwitchNodeConfigurationSchema = SwitchStepSchema.omit({
  cases: true,
  default: true,
});
export type EnterSwitchNodeConfiguration = z.infer<typeof EnterSwitchNodeConfigurationSchema>;

export const EnterSwitchNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-switch'),
  exitNodeId: z.string(),
  configuration: EnterSwitchNodeConfigurationSchema,
});
export type EnterSwitchNode = z.infer<typeof EnterSwitchNodeSchema>;

export const EnterCaseBranchNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-case-branch'),
  match: z.union([z.string(), z.number(), z.boolean()]),
  index: z.number().int().nonnegative(),
});
export type EnterCaseBranchNode = z.infer<typeof EnterCaseBranchNodeSchema>;

export const ExitCaseBranchNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-case-branch'),
  startNodeId: z.string(),
});
export type ExitCaseBranchNode = z.infer<typeof ExitCaseBranchNodeSchema>;

export const EnterDefaultBranchNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-default-branch'),
});
export type EnterDefaultBranchNode = z.infer<typeof EnterDefaultBranchNodeSchema>;

export const ExitDefaultBranchNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-default-branch'),
  startNodeId: z.string(),
});
export type ExitDefaultBranchNode = z.infer<typeof ExitDefaultBranchNodeSchema>;

export const ExitSwitchNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-switch'),
  startNodeId: z.string(),
});
export type ExitSwitchNode = z.infer<typeof ExitSwitchNodeSchema>;
