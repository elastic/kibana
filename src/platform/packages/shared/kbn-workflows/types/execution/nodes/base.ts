/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { HttpStepSchema, WaitStepSchema } from '../../../spec/schema';

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const AtomicGraphNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('atomic'),
  stepId: z.string(),
  configuration: z.any(),
});
export type AtomicGraphNode = z.infer<typeof AtomicGraphNodeSchema>;

export const WaitGraphNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('wait'),
  stepId: z.string(),
  configuration: WaitStepSchema,
});
export type WaitGraphNode = z.infer<typeof WaitGraphNodeSchema>;

export const HttpGraphNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('http'),
  stepId: z.string(),
  configuration: HttpStepSchema,
});
export type HttpGraphNode = z.infer<typeof HttpGraphNodeSchema>;
