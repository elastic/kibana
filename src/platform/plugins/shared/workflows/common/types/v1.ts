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
  RSVP = 'rsvp',
  RUNNING = 'running',

  // Done
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface WorkflowExecutionHistoryModel {
  id: string;
  workflowId?: string;
  workflowName?: string;

  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string;
}

export interface WorkflowExecutionLogModel {
  timestamp: string;
  message: string;
  level: string;
}

export interface WorkflowExecutionModel {
  id: string;
  status: ExecutionStatus;

  startedAt: string;
  finishedAt: string;

  workflowId?: string;
  workflowName?: string;

  logs: WorkflowExecutionLogModel[];
}

export enum WorkflowStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule';
  enabled: boolean;
  config?: Record<string, any>;
}

interface WorkflowDefinition {
  id: string;
  type: 'trigger' | 'step';
  config: Record<string, any>;
  children: string[]; // List of children Nodes
  next: string; // ID of next Node

  position: { x: number; y: number };
  color: string;
  note: string;
}

interface WorkflowBaseModel {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;

  triggers: WorkflowTrigger[];

  createdAt: string;
  createdBy: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;

  history: WorkflowExecutionHistoryModel[];

  tags: string[];
}

export interface WorkflowListItemModel extends WorkflowBaseModel {
  lastExecutionAt?: string;
  lastExecution?: WorkflowExecutionModel;
}

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

export interface WorkflowModel extends WorkflowBaseModel {
  yaml: string;
  definition: WorkflowDefinition[];

  executions: WorkflowExecutionModel[];
}
