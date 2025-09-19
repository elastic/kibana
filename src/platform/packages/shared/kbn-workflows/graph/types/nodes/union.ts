/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { AtomicGraphNodeSchema, HttpGraphNodeSchema, WaitGraphNodeSchema } from './base';
import {
  EnterIfNodeSchema,
  ExitIfNodeSchema,
  EnterConditionBranchNodeSchema,
  ExitConditionBranchNodeSchema,
} from './branching_nodes';
import { EnterForeachNodeSchema, ExitForeachNodeSchema } from './loop_nodes';
import {
  EnterRetryNodeSchema,
  ExitRetryNodeSchema,
  EnterContinueNodeSchema,
  ExitContinueNodeSchema,
  EnterTryBlockNodeSchema,
  ExitTryBlockNodeSchema,
  EnterNormalPathNodeSchema,
  ExitNormalPathNodeSchema,
  EnterFallbackPathNodeSchema,
  ExitFallbackPathNodeSchema,
} from './on_failure_nodes';

const UnionExecutionGraphNodeSchema = z.discriminatedUnion('type', [
  AtomicGraphNodeSchema,
  HttpGraphNodeSchema,
  WaitGraphNodeSchema,
  EnterIfNodeSchema,
  ExitIfNodeSchema,
  EnterConditionBranchNodeSchema,
  ExitConditionBranchNodeSchema,
  EnterForeachNodeSchema,
  ExitForeachNodeSchema,
  EnterRetryNodeSchema,
  ExitRetryNodeSchema,
  EnterContinueNodeSchema,
  ExitContinueNodeSchema,
  EnterTryBlockNodeSchema,
  ExitTryBlockNodeSchema,
  EnterNormalPathNodeSchema,
  ExitNormalPathNodeSchema,
  EnterFallbackPathNodeSchema,
  ExitFallbackPathNodeSchema,
]);

export type UnionExecutionGraphNode = z.infer<typeof UnionExecutionGraphNodeSchema>;
