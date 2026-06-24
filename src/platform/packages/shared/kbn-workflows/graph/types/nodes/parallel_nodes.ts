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
import { ParallelStepObjectSchema } from '../../../spec/schema';

export const EnterParallelNodeConfigurationSchema = ParallelStepObjectSchema.omit({
  steps: true,
  branches: true,
});
export type EnterParallelNodeConfiguration = z.infer<typeof EnterParallelNodeConfigurationSchema>;

// Descriptor for one static branch, carried on the enter node so the executor
// can advance each named branch through its own subgraph start node.
export const ParallelBranchDescriptorSchema = z.object({
  name: z.string(),
  startNodeId: z.string(),
});
export type ParallelBranchDescriptor = z.infer<typeof ParallelBranchDescriptorSchema>;

export const EnterParallelNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-parallel'),
  exitNodeId: z.string(),
  // Dynamic fan-out: the single shared branch body's start node. The durable-tick
  // node runs this subgraph once per fan-out item. Undefined for static mode.
  branchStartNodeId: z.string().optional(),
  // Static scatter-gather: one descriptor per named branch, each pointing at its
  // own subgraph start node. Undefined for dynamic mode.
  branches: z.array(ParallelBranchDescriptorSchema).optional(),
  configuration: EnterParallelNodeConfigurationSchema,
});
export type EnterParallelNode = z.infer<typeof EnterParallelNodeSchema>;

export const ExitParallelNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-parallel'),
  startNodeId: z.string(),
});
export type ExitParallelNode = z.infer<typeof ExitParallelNodeSchema>;
