/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BuiltInStepType,
  ElasticsearchStep,
  ForEachStep,
  HttpStep,
  IfStep,
  KibanaStep,
  MergeStep,
  ParallelStep,
  Step,
  TriggerType,
  WaitStep,
  WorkflowYaml,
} from '../spec/schema';
import { BuiltInStepTypes, TriggerTypes } from '../spec/schema';
import { type EsWorkflow, ExecutionStatus } from './v1';

export function transformWorkflowYamlJsontoEsWorkflow(
  workflowDefinition: WorkflowYaml
): Omit<
  EsWorkflow,
  'spaceId' | 'id' | 'createdAt' | 'createdBy' | 'lastUpdatedAt' | 'lastUpdatedBy' | 'yaml'
> {
  // TODO: handle merge, if, foreach, etc.

  return {
    name: workflowDefinition.name,
    description: workflowDefinition.description,
    tags: workflowDefinition.tags ?? [],
    enabled: workflowDefinition.enabled,
    definition: workflowDefinition,
    deleted_at: null,
    valid: true,
  };
}

export function isInProgressStatus(status: ExecutionStatus) {
  return (
    status === ExecutionStatus.RUNNING ||
    status === ExecutionStatus.PENDING ||
    status === ExecutionStatus.WAITING ||
    status === ExecutionStatus.WAITING_FOR_INPUT
  );
}

export function isDangerousStatus(status: ExecutionStatus) {
  return status === ExecutionStatus.FAILED || status === ExecutionStatus.CANCELLED;
}

// Type guards for steps types
export const isWaitStep = (step: Step): step is WaitStep => step.type === 'wait';
export const isHttpStep = (step: Step): step is HttpStep => step.type === 'http';
export const isElasticsearchStep = (step: Step): step is ElasticsearchStep =>
  step.type === 'elasticsearch';
export const isKibanaStep = (step: Step): step is KibanaStep => step.type === 'kibana';
export const isForeachStep = (step: Step): step is ForEachStep => step.type === 'foreach';
export const isIfStep = (step: Step): step is IfStep => step.type === 'if';
export const isParallelStep = (step: Step): step is ParallelStep => step.type === 'parallel';
export const isMergeStep = (step: Step): step is MergeStep => step.type === 'merge';
export const isBuiltInStepType = (type: string): type is BuiltInStepType =>
  BuiltInStepTypes.includes(type as BuiltInStepType);
export const isTriggerType = (type: string): type is TriggerType =>
  TriggerTypes.includes(type as TriggerType);
