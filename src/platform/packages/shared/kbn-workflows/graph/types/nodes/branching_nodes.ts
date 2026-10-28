/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { GraphNodeSchema } from './base';
import { IfStepSchema } from '../../../spec/schema';

export const EnterIfNodeConfigurationSchema = IfStepSchema.omit({
  steps: true,
  else: true,
});

export const EnterIfNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('enter-if')),
  exitNodeId: lazySchema(() => z.string()),
  configuration: EnterIfNodeConfigurationSchema,
});
export type EnterIfNode = z.infer<typeof EnterIfNodeSchema>;

export const EnterConditionBranchNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.union([z.literal('enter-then-branch'), z.literal('enter-else-branch')])),
  condition: lazySchema(() => z.union([z.string(), z.undefined()]).optional()),
});
export type EnterConditionBranchNode = z.infer<typeof EnterConditionBranchNodeSchema>;

export const ExitConditionBranchNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.union([z.literal('exit-then-branch'), z.literal('exit-else-branch')])),
  startNodeId: lazySchema(() => z.string()),
});
export type ExitConditionBranchNode = z.infer<typeof ExitConditionBranchNodeSchema>;

export const ExitIfNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('exit-if')),
  startNodeId: lazySchema(() => z.string()),
});

export type ExitIfNode = z.infer<typeof ExitIfNodeSchema>;
