/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AtomicGraphNode,
  DataSetGraphNode,
  ElasticsearchGraphNode,
  HttpGraphNode,
  KibanaGraphNode,
  WaitGraphNode,
} from './nodes/base';
import type {
  EnterConditionBranchNode,
  EnterIfNode,
  ExitConditionBranchNode,
  ExitIfNode,
} from './nodes/branching_nodes';
import type { EnterForeachNode, ExitForeachNode } from './nodes/loop_nodes';
import type {
  EnterContinueNode,
  EnterNormalPathNode,
  EnterRetryNode,
  EnterTimeoutZoneNode,
  EnterTryBlockNode,
  ExitContinueNode,
  ExitNormalPathNode,
  ExitRetryNode,
  ExitTimeoutZoneNode,
  ExitTryBlockNode,
} from './nodes/on_failure_nodes';
import type { GraphNodeUnion } from './nodes/union';

export const isAtomic = (node: GraphNodeUnion): node is AtomicGraphNode => node.type === 'atomic';

export const isElasticsearch = (node: GraphNodeUnion): node is ElasticsearchGraphNode =>
  node.type.startsWith('elasticsearch.');

export const isKibana = (node: GraphNodeUnion): node is KibanaGraphNode =>
  node.type.startsWith('kibana.');

export const isHttp = (node: GraphNodeUnion): node is HttpGraphNode => node.type === 'http';

export const isWait = (node: GraphNodeUnion): node is WaitGraphNode => node.type === 'wait';

export const isDataSet = (node: GraphNodeUnion): node is DataSetGraphNode =>
  node.type === 'data.set';

export const isEnterIf = (node: GraphNodeUnion): node is EnterIfNode => node.type === 'enter-if';

export const isExitIf = (node: GraphNodeUnion): node is ExitIfNode => node.type === 'exit-if';

export const isEnterConditionBranch = (node: GraphNodeUnion): node is EnterConditionBranchNode =>
  node.type === 'enter-condition-branch';

export const isExitConditionBranch = (node: GraphNodeUnion): node is ExitConditionBranchNode =>
  node.type === 'exit-condition-branch';

export const isEnterForeach = (node: GraphNodeUnion): node is EnterForeachNode =>
  node.type === 'enter-foreach';

export const isExitForeach = (node: GraphNodeUnion): node is ExitForeachNode =>
  node.type === 'exit-foreach';

export const isEnterRetry = (node: GraphNodeUnion): node is EnterRetryNode =>
  node.type === 'enter-retry';

export const isExitRetry = (node: GraphNodeUnion): node is ExitRetryNode =>
  node.type === 'exit-retry';

export const isEnterContinue = (node: GraphNodeUnion): node is EnterContinueNode =>
  node.type === 'enter-continue';

export const isExitContinue = (node: GraphNodeUnion): node is ExitContinueNode =>
  node.type === 'exit-continue';

export const isEnterTryBlock = (node: GraphNodeUnion): node is EnterTryBlockNode =>
  node.type === 'enter-try-block';

export const isExitTryBlock = (node: GraphNodeUnion): node is ExitTryBlockNode =>
  node.type === 'exit-try-block';

export const isEnterNormalPath = (node: GraphNodeUnion): node is EnterNormalPathNode =>
  node.type === 'enter-normal-path';

export const isExitNormalPath = (node: GraphNodeUnion): node is ExitNormalPathNode =>
  node.type === 'exit-normal-path';

export const isEnterWorkflowTimeoutZone = (node: GraphNodeUnion): node is EnterTimeoutZoneNode =>
  node.type === 'enter-timeout-zone' && node.stepType === 'workflow_level_timeout';

export const isExitWorkflowTimeoutZone = (node: GraphNodeUnion): node is ExitTimeoutZoneNode =>
  node.type === 'exit-timeout-zone' && node.stepType === 'workflow_level_timeout';

export const isEnterStepTimeoutZone = (node: GraphNodeUnion): node is EnterTimeoutZoneNode =>
  node.type === 'enter-timeout-zone' && node.stepType !== 'workflow_level_timeout';

export const isExitStepTimeoutZone = (node: GraphNodeUnion): node is ExitTimeoutZoneNode =>
  node.type === 'exit-timeout-zone' && node.stepType !== 'workflow_level_timeout';
