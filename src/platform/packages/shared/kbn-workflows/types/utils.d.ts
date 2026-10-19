/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ConnectorContractUnion,
  DynamicConnectorContract,
  EsWorkflowCreate,
  ExecutionStatus,
  HttpMethod,
  InternalConnectorContract,
  StabilityLevel,
  WorkflowStepExecutionDto,
} from './v1';
import type {
  BuiltInStepProperty,
  BuiltInStepType,
  ElasticsearchStep,
  ForEachStep,
  IfStep,
  KibanaStep,
  MergeStep,
  ParallelStep,
  Step,
  SwitchStep,
  WaitStep,
  WhileStep,
  WorkflowYaml,
} from '../spec/schema';
import type { TriggerType } from '../spec/schema/triggers';
export declare function transformWorkflowYamlJsontoEsWorkflow(
  workflowDefinition: WorkflowYaml
): EsWorkflowCreate;
export declare function isInProgressStatus(
  status: ExecutionStatus
): status is
  | ExecutionStatus.PENDING
  | ExecutionStatus.WAITING
  | ExecutionStatus.WAITING_FOR_INPUT
  | ExecutionStatus.WAITING_FOR_CHILD
  | ExecutionStatus.RUNNING
  | ExecutionStatus.QUEUED;
export declare function isDangerousStatus(
  status: ExecutionStatus
): status is ExecutionStatus.FAILED | ExecutionStatus.CANCELLED;
export declare function isTerminalStatus(status: ExecutionStatus): boolean;
export declare function isFailedBeforeSteps(
  status: ExecutionStatus,
  stepExecutions: WorkflowStepExecutionDto[]
): boolean;
export declare const isWaitStep: (step: Step) => step is WaitStep;
export declare const isElasticsearchStep: (step: Step) => step is ElasticsearchStep;
export declare const isKibanaStep: (step: Step) => step is KibanaStep;
export declare const isForeachStep: (step: Step) => step is ForEachStep;
export declare const isWhileStep: (step: Step) => step is WhileStep;
export declare const isIfStep: (step: Step) => step is IfStep;
export declare const isParallelStep: (step: Step) => step is ParallelStep;
export declare const isMergeStep: (step: Step) => step is MergeStep;
export declare const isSwitchStep: (step: Step) => step is SwitchStep;
export declare const isBuiltInStepType: (type: string) => type is BuiltInStepType;
export declare const isTriggerType: (type: string) => type is TriggerType;
export declare const isInternalConnector: (
  connector: ConnectorContractUnion
) => connector is InternalConnectorContract;
export declare const isDynamicConnector: (
  connector: ConnectorContractUnion
) => connector is DynamicConnectorContract;
export declare const isHttpMethod: (method: string) => method is HttpMethod;
export declare const isBuiltInStepProperty: (property: string) => property is BuiltInStepProperty;
export declare const getBuiltInStepStability: (type: string) => StabilityLevel | undefined;
