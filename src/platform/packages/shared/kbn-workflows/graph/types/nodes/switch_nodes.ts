/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { GraphNodeSchema } from './base';
import { SwitchStepSchema } from '../../../spec/schema';

export const EnterSwitchNodeConfigurationSchema = SwitchStepSchema.omit({
  cases: true,
  default: true,
});
export type EnterSwitchNodeConfiguration = z.infer<typeof EnterSwitchNodeConfigurationSchema>;

export const EnterSwitchNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('enter-switch')),
  exitNodeId: lazySchema(() => z.string()),
  configuration: EnterSwitchNodeConfigurationSchema,
});
export type EnterSwitchNode = z.infer<typeof EnterSwitchNodeSchema>;

export const EnterCaseBranchNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('enter-case-branch')),
  match: lazySchema(() => z.union([z.string(), z.number(), z.boolean()])),
  index: z.number().int().nonnegative(),
});
export type EnterCaseBranchNode = z.infer<typeof EnterCaseBranchNodeSchema>;

export const ExitCaseBranchNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('exit-case-branch')),
  startNodeId: lazySchema(() => z.string()),
});
export type ExitCaseBranchNode = z.infer<typeof ExitCaseBranchNodeSchema>;

export const EnterDefaultBranchNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('enter-default-branch')),
});
export type EnterDefaultBranchNode = z.infer<typeof EnterDefaultBranchNodeSchema>;

export const ExitDefaultBranchNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('exit-default-branch')),
  startNodeId: lazySchema(() => z.string()),
});
export type ExitDefaultBranchNode = z.infer<typeof ExitDefaultBranchNodeSchema>;

export const ExitSwitchNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('exit-switch')),
  startNodeId: lazySchema(() => z.string()),
});
export type ExitSwitchNode = z.infer<typeof ExitSwitchNodeSchema>;
