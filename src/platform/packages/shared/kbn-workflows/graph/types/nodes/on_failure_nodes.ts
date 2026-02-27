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
import { WorkflowRetrySchema } from '../../../spec/schema';

export const EnterContinueNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-continue'),
  configuration: z.object({
    condition: z.union([z.string(), z.boolean()]),
  }),
  exitNodeId: z.string(),
});
export type EnterContinueNode = z.infer<typeof EnterContinueNodeSchema>;

export const ExitContinueNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-continue'),
});
export type ExitContinueNode = z.infer<typeof ExitContinueNodeSchema>;

export const EnterRetryNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-retry'),
  exitNodeId: z.string(),
  configuration: WorkflowRetrySchema,
});
export type EnterRetryNode = z.infer<typeof EnterRetryNodeSchema>;

export const ExitRetryNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-retry'),
  startNodeId: z.string(),
});
export type ExitRetryNode = z.infer<typeof ExitRetryNodeSchema>;

export const EnterTryBlockNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-try-block'),
  enterNormalPathNodeId: z.string(),
  enterFallbackPathNodeId: z.string(),
  exitNodeId: z.string(),
});
export type EnterTryBlockNode = z.infer<typeof EnterTryBlockNodeSchema>;

export const ExitTryBlockNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-try-block'),
  enterNodeId: z.string(),
});
export type ExitTryBlockNode = z.infer<typeof ExitTryBlockNodeSchema>;

export const EnterNormalPathNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-normal-path'),
  enterZoneNodeId: z.string(),
  enterFailurePathNodeId: z.string(),
});
export type EnterNormalPathNode = z.infer<typeof EnterNormalPathNodeSchema>;

export const ExitNormalPathNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-normal-path'),
  exitOnFailureZoneNodeId: z.string(),
  enterNodeId: z.string(),
});
export type ExitNormalPathNode = z.infer<typeof ExitNormalPathNodeSchema>;

export const EnterFallbackPathNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-fallback-path'),
  enterZoneNodeId: z.string(),
});
export type EnterFallbackPathNode = z.infer<typeof EnterFallbackPathNodeSchema>;

export const ExitFallbackPathNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-fallback-path'),
  exitOnFailureZoneNodeId: z.string(),
  enterNodeId: z.string(),
});
export type ExitFallbackPathNode = z.infer<typeof ExitFallbackPathNodeSchema>;

export const OnFailureNodeSchema = GraphNodeSchema.extend({
  type: z.literal('on-failure'),
});
export type OnFailureNode = z.infer<typeof OnFailureNodeSchema>;

export const StepLevelOnFailureNodeSchema = GraphNodeSchema.extend({
  type: z.literal('step-level-on-failure'),
});
export type StepLevelOnFailureNode = z.infer<typeof StepLevelOnFailureNodeSchema>;

export const WorkflowLevelOnFailureNodeSchema = GraphNodeSchema.extend({
  type: z.literal('workflow-level-on-failure'),
});
export type WorkflowLevelOnFailureNode = z.infer<typeof WorkflowLevelOnFailureNodeSchema>;

// Timeout handling nodes - stack-based timeout management
export const EnterTimeoutZoneNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('enter-timeout-zone'),
  timeout: z.string(),
  stepType: z.union([z.literal('workflow_level_timeout'), z.literal('step_level_timeout')]),
});
export type EnterTimeoutZoneNode = z.infer<typeof EnterTimeoutZoneNodeSchema>;

export const ExitTimeoutZoneNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('exit-timeout-zone'),
  stepType: z.union([z.literal('workflow_level_timeout'), z.literal('step_level_timeout')]),
});
export type ExitTimeoutZoneNode = z.infer<typeof ExitTimeoutZoneNodeSchema>;
