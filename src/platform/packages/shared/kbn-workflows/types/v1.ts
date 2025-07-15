/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { WorkflowYaml } from '../spec/schema';

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

export interface EsWorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  triggers: EsWorkflowTrigger[];
  steps: EsWorkflowStep[];
  createdAt: string;
  createdBy: string;
  startedAt: string;
  finishedAt: string;
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

export const EsWorkflowStepSchema = z.object({
  id: z.string(),
  connectorType: z.string(),
  connectorName: z.string(),
  inputs: z.record(z.any()),
  needs: z.array(z.string()).optional(),
});

export type EsWorkflowStep = z.infer<typeof EsWorkflowStepSchema>;

export interface EsWorkflowStepExecution {
  id: string;
  stepId: string;
  workflowRunId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
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

export const EsWorkflowTriggerSchema = z.object({
  id: z.string(),
  type: z.enum(['manual', 'schedule', 'detection-rule']),
  enabled: z.boolean(),
  config: z.record(z.any()).optional(),
});

export type EsWorkflowTrigger = z.infer<typeof EsWorkflowTriggerSchema>;

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

export interface WorkflowExecutionDto {
  id: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string;
  workflowId?: string;
  workflowName?: string;
  stepExecutions: EsWorkflowStepExecution[];
  duration: number | null;
}

export type WorkflowExecutionListItemDto = Omit<WorkflowExecutionDto, 'stepExecutions'>;

export interface WorkflowExecutionListDto {
  results: WorkflowExecutionListItemDto[];
  _pagination: {
    offset: number;
    limit: number;
    total: number;
    next?: string;
    prev?: string;
  };
}

// TODO: convert to actual elastic document spec

export const EsWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.nativeEnum(WorkflowStatus),
  triggers: z.array(EsWorkflowTriggerSchema),
  tags: z.array(z.string()),
  steps: z.array(EsWorkflowStepSchema),
  createdAt: z.date(),
  createdBy: z.string(),
  lastUpdatedAt: z.date(),
  lastUpdatedBy: z.string(),
  yaml: z.string(),
});

export type EsWorkflow = z.infer<typeof EsWorkflowSchema>;

export const CreateWorkflowCommandSchema = EsWorkflowSchema.omit({
  id: true,
  createdAt: true,
  createdBy: true,
  lastUpdatedAt: true,
  lastUpdatedBy: true,
});

export type CreateWorkflowCommand = z.infer<typeof CreateWorkflowCommandSchema>;

export interface WorkflowDetailDto {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  triggers: EsWorkflowTrigger[];
  steps: EsWorkflowStep[];
  createdAt: Date;
  createdBy: string;
  lastUpdatedAt: Date;
  lastUpdatedBy: string;
  yaml: string;
}

export interface WorkflowListItemDto {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  triggers: EsWorkflowTrigger[];
  createdAt: Date;
  history: WorkflowExecutionHistoryModel[];
}

export interface WorkflowListDto {
  _pagination: {
    offset: number;
    limit: number;
    total: number;
    next?: string;
    prev?: string;
  };
  results: WorkflowListItemDto[];
}

export type WorkflowExecutionEngineModel = Pick<
  EsWorkflow,
  'id' | 'name' | 'status' | 'triggers' | 'steps'
>;

export function transformWorkflowYamlJsontoExecutionEngineModel(
  workflow: Partial<WorkflowYaml>
): Omit<WorkflowExecutionEngineModel, 'id'> {
  const { name, enabled, triggers, steps } = workflow.workflow!;

  const triggersMap = {
    'triggers.elastic.detectionRule': 'detection-rule',
    'triggers.elastic.scheduled': 'schedule',
    'triggers.elastic.manual': 'manual',
  };

  return {
    name,
    status: enabled ? WorkflowStatus.ACTIVE : WorkflowStatus.DRAFT,
    triggers: triggers?.map((trigger) => ({
      id: trigger.type,
      type: triggersMap[trigger.type] as EsWorkflowTrigger['type'],
      enabled: true,
      config: trigger.type === 'triggers.elastic.detectionRule' ? { ...trigger.with } : {},
    })),
    steps: steps?.map((step) => ({
      id: step.name,
      connectorType: step.type,
      // @ts-expect-error TODO: fix once the schema is stable
      connectorName: step.type === 'console' ? step['connector-id'] : undefined,
      // @ts-expect-error TODO: fix once the schema is stable
      inputs: step.type === 'console' ? { ...step.with } : {},
    })),
  };
}

export function transformWorkflowExecutionEngineModelToYaml(
  workflow: WorkflowExecutionEngineModel
): WorkflowYaml {
  const triggersMap = {
    'detection-rule': 'triggers.elastic.detectionRule',
    schedule: 'triggers.elastic.scheduled',
    manual: 'triggers.elastic.manual',
  };

  return {
    workflow: {
      name: workflow.name,
      enabled: workflow.status === WorkflowStatus.ACTIVE,
      triggers: workflow.triggers.map((trigger) => ({
        type: triggersMap[trigger.type] as EsWorkflowTrigger['type'],
        with: trigger.type === 'manual' ? undefined : { ...trigger.config },
      })),
      steps: workflow.steps.map((step) => ({
        name: step.id,
        type: step.connectorType,
        'connector-id': step.connectorName,
        with: step.inputs,
      })),
    },
  };
}
