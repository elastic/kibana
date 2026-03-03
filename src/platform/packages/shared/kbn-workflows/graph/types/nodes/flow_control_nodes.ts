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

export const FlowBreakNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('flow-break'),
  loopExitNodeId: z.string(),
  loopStepId: z.string(),
  condition: z.string().optional(),
});

export type FlowBreakNode = z.infer<typeof FlowBreakNodeSchema>;

export const FlowContinueNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('flow-continue'),
  loopEnterNodeId: z.string(),
  condition: z.string().optional(),
});

export type FlowContinueNode = z.infer<typeof FlowContinueNodeSchema>;
