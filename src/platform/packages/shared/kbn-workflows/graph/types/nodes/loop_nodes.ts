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
import { ForEachStepSchema, WhileStepSchema } from '../../../spec/schema';

export const EnterForeachNodeConfigurationSchema = ForEachStepSchema.omit({
  steps: true,
});
export type EnterForeachNodeConfiguration = z.infer<typeof EnterForeachNodeConfigurationSchema>;

export const EnterForeachNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('enter-foreach')),
  exitNodeId: lazySchema(() => z.string()),
  configuration: EnterForeachNodeConfigurationSchema,
});

export type EnterForeachNode = z.infer<typeof EnterForeachNodeSchema>;

export const ExitForeachNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('exit-foreach')),
  startNodeId: lazySchema(() => z.string()),
  maxIterations: lazySchema(() => z.number().int().positive().optional()),
  onLimit: lazySchema(() => z.enum(['continue', 'fail']).optional()),
});

export type ExitForeachNode = z.infer<typeof ExitForeachNodeSchema>;

export const EnterWhileNodeConfigurationSchema = WhileStepSchema.omit({
  steps: true,
});
export type EnterWhileNodeConfiguration = z.infer<typeof EnterWhileNodeConfigurationSchema>;

export const EnterWhileNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('enter-while')),
  exitNodeId: lazySchema(() => z.string()),
  configuration: EnterWhileNodeConfigurationSchema,
});

export type EnterWhileNode = z.infer<typeof EnterWhileNodeSchema>;

export const ExitWhileNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('exit-while')),
  startNodeId: lazySchema(() => z.string()),
  condition: lazySchema(() => z.string()),
  maxIterations: lazySchema(() => z.number().int().positive().optional()),
  onLimit: lazySchema(() => z.enum(['continue', 'fail']).optional()),
});

export type ExitWhileNode = z.infer<typeof ExitWhileNodeSchema>;
