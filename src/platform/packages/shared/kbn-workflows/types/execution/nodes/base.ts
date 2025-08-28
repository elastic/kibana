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

export const ExecutionGraphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  configuration: z.any(),
});

export type ExecutionGraphNode = z.infer<typeof ExecutionGraphNodeSchema>;

export const AtomicGraphNodeSchema = z.object({
  id: z.string(),
  type: z.literal('atomic'),
  configuration: z.any(),
});
export type AtomicGraphNode = z.infer<typeof AtomicGraphNodeSchema>;

export const WaitGraphNodeSchema = z.object({
  id: z.string(),
  type: z.literal('wait'),
  configuration: WaitStepSchema,
});
export type WaitGraphNode = z.infer<typeof WaitGraphNodeSchema>;

export const HttpGraphNodeSchema = z.object({
  id: z.string(),
  type: z.literal('http'),
  configuration: HttpStepSchema,
});
export type HttpGraphNode = z.infer<typeof HttpGraphNodeSchema>;
