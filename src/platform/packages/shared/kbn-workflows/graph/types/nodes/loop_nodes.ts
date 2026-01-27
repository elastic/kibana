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
import { ForEachStepSchema } from '../../../spec/schema';

export const EnterForeachNodeConfigurationSchema = ForEachStepSchema.omit({
  steps: true,
});
export type EnterForeachNodeConfiguration = z.infer<typeof EnterForeachNodeConfigurationSchema>;

export const EnterForeachNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-foreach'),
  exitNodeId: z.string(),
  configuration: EnterForeachNodeConfigurationSchema,
});

export type EnterForeachNode = z.infer<typeof EnterForeachNodeSchema>;

export const ExitForeachNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-foreach'),
  startNodeId: z.string(),
});

export type ExitForeachNode = z.infer<typeof ExitForeachNodeSchema>;
