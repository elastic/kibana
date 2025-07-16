/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum ExecutionStatus {
  // In progress
  PENDING = 'pending',
  WAITING_FOR_INPUT = 'waiting_for_input',
  RUNNING = 'running',

  // Done
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  error: string | null;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  createdAt: Date;
  createdBy: string;
  startedAt: Date;
  finishedAt: Date;
  duration: number;
}

export interface ProviderInput {
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string | number | boolean;
}

export interface Provider {
  type: string;
  action: (stepInputs?: Record<string, any>) => Promise<Record<string, any> | void>;
  inputsDefinition: Record<string, ProviderInput>;
}

export interface WorkflowStep {
  id: string;
  connectorType: string;
  connectorName: string;
  inputs: Record<string, any>;
  needs?: string[];
}

export interface WorkflowStepExecution {
  id: string;
  stepId: string;
  workflowRunId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  executionTimeMs?: number;
  error?: string;
  output?: Record<string, any>;
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule' | 'detection-rule';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'step' | 'container' | 'switch';
  config: Record<string, any>;
  children: string[];
  next: string;
  position: { x: number; y: number };
  color: string;
  note: string;
  workflowStepId: string;
}

export interface WorkflowExecutionHistoryModel {
  id: string;
  workflowId?: string;
  workflowName?: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string;
  duration: number | null;
}

export interface WorkflowExecutionLogModel {
  timestamp: string;
  message: string;
  level: string;
}

export interface WorkflowExecutionModel {
  id: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt: Date;
  workflowId?: string;
  workflowName?: string;
  stepExecutions: WorkflowStepExecution[];
  duration: number | null;
}

export interface WorkflowExecutionListModel {
  results: WorkflowExecutionModel[];
  _pagination: {
    offset: number;
    limit: number;
    total: number;
    next?: string;
    prev?: string;
  };
}

// TODO: convert to actual elastic document spec
export interface EsWorkflowSchema {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  triggers: WorkflowTrigger[];
  tags: string[];
  executions: WorkflowExecutionModel[];
  history: WorkflowExecutionHistoryModel[];
  createdAt: string;
  createdBy: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  yaml: string;
  steps: WorkflowStep[];
  nodes: WorkflowNode[];
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  status?: WorkflowStatus;
  triggers?: WorkflowTrigger[];
  steps?: WorkflowStep[];
}

export type WorkflowModel = EsWorkflowSchema;

export type WorkflowListItemModel = Pick<
  WorkflowModel,
  'id' | 'name' | 'description' | 'status' | 'triggers' | 'tags' | 'history'
>;

export interface WorkflowListModel {
  _pagination: {
    offset: number;
    limit: number;
    total: number;
    next?: string;
    prev?: string;
  };
  results: WorkflowListItemModel[];
}

export type WorkflowExecutionEngineModel = Pick<
  WorkflowModel,
  'id' | 'name' | 'status' | 'triggers' | 'steps'
>;
