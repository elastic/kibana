/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import {
  AtomicGraphNodeSchema,
  DataSetGraphNodeSchema,
  ElasticsearchGraphNodeSchema,
  HttpGraphNodeSchema,
  KibanaGraphNodeSchema,
  WaitGraphNodeSchema,
} from './base';
import {
  EnterConditionBranchNodeSchema,
  EnterIfNodeSchema,
  ExitConditionBranchNodeSchema,
  ExitIfNodeSchema,
} from './branching_nodes';
import { EnterForeachNodeSchema, ExitForeachNodeSchema } from './loop_nodes';
import {
  EnterContinueNodeSchema,
  EnterFallbackPathNodeSchema,
  EnterNormalPathNodeSchema,
  EnterRetryNodeSchema,
  EnterTimeoutZoneNodeSchema,
  EnterTryBlockNodeSchema,
  ExitContinueNodeSchema,
  ExitFallbackPathNodeSchema,
  ExitNormalPathNodeSchema,
  ExitRetryNodeSchema,
  ExitTimeoutZoneNodeSchema,
  ExitTryBlockNodeSchema,
  OnFailureNodeSchema,
  StepLevelOnFailureNodeSchema,
  WorkflowLevelOnFailureNodeSchema,
} from './on_failure_nodes';

const GraphNodeUnionSchema = z.discriminatedUnion('type', [
  AtomicGraphNodeSchema,
  DataSetGraphNodeSchema,
  ElasticsearchGraphNodeSchema,
  KibanaGraphNodeSchema,
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
  EnterTimeoutZoneNodeSchema,
  ExitTimeoutZoneNodeSchema,
  OnFailureNodeSchema,
  StepLevelOnFailureNodeSchema,
  WorkflowLevelOnFailureNodeSchema,
]);

export type GraphNodeUnion = z.infer<typeof GraphNodeUnionSchema>;
