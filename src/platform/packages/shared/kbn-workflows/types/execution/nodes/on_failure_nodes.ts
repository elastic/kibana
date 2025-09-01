/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { WorkflowRetrySchema } from '../../../spec/schema';

export const EnterContinueNodeSchema = z.object({
  id: z.string(),
  type: z.literal('enter-continue'),
  exitNodeId: z.string(),
});
export type EnterContinueNode = z.infer<typeof EnterContinueNodeSchema>;

export const ExitContinueNodeSchema = z.object({
  id: z.string(),
  type: z.literal('exit-continue'),
});
export type ExitContinueNode = z.infer<typeof ExitContinueNodeSchema>;

export const EnterRetryNodeSchema = z.object({
  id: z.string(),
  type: z.literal('enter-retry'),
  exitNodeId: z.string(),
  configuration: WorkflowRetrySchema,
});
export type EnterRetryNode = z.infer<typeof EnterRetryNodeSchema>;

export const ExitRetryNodeSchema = z.object({
  id: z.string(),
  type: z.literal('exit-retry'),
  startNodeId: z.string(),
});
export type ExitRetryNode = z.infer<typeof ExitRetryNodeSchema>;

export const EnterTryBlockNodeSchema = z.object({
  id: z.string(),
  type: z.literal('enter-try-block'),
  enterNormalPathNodeId: z.string(),
  exitNodeId: z.string(),
});
export type EnterTryBlockNode = z.infer<typeof EnterTryBlockNodeSchema>;

export const ExitTryBlockNodeSchema = z.object({
  id: z.string(),
  type: z.literal('exit-try-block'),
  enterNodeId: z.string(),
});
export type ExitTryBlockNode = z.infer<typeof ExitTryBlockNodeSchema>;

export const EnterNormalPathNodeSchema = z.object({
  id: z.string(),
  type: z.literal('enter-normal-path'),
  enterZoneNodeId: z.string(),
  enterFailurePathNodeId: z.string(),
});
export type EnterNormalPathNode = z.infer<typeof EnterNormalPathNodeSchema>;

export const ExitNormalPathNodeSchema = z.object({
  id: z.string(),
  type: z.literal('exit-normal-path'),
  exitOnFailureZoneNodeId: z.string(),
  enterNodeId: z.string(),
});
export type ExitNormalPathNode = z.infer<typeof ExitNormalPathNodeSchema>;

export const EnterFallbackPathNodeSchema = z.object({
  id: z.string(),
  type: z.literal('enter-fallback-path'),
  enterZoneNodeId: z.string(),
});
export type EnterFallbackPathNode = z.infer<typeof EnterFallbackPathNodeSchema>;

export const ExitFallbackPathNodeSchema = z.object({
  id: z.string(),
  type: z.literal('exit-fallback-path'),
  exitOnFailureZoneNodeId: z.string(),
  enterNodeId: z.string(),
});
export type ExitFallbackPathNode = z.infer<typeof ExitFallbackPathNodeSchema>;
