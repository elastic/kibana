/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowExecutionContext } from '@kbn/workflows';

export interface WorkflowExecutionContextDefinitionParams<TType extends string = string> {
  request: KibanaRequest;
  executionContext: WorkflowExecutionContext & { type: TType };
  workflow: {
    id: string;
    name: string;
  };
  workflowExecutionId: string;
  inputs: Record<string, unknown>;
}

export interface WorkflowExecutionContextDefinition<TType extends string = string> {
  type: TType;
  onExecutionStarted?(params: WorkflowExecutionContextDefinitionParams<TType>): Promise<void>;
}

/**
 * Creates a workflow execution context definition while preserving its context type literal.
 */
export const createWorkflowExecutionContextDefinition = <TType extends string>(
  definition: WorkflowExecutionContextDefinition<TType>
): WorkflowExecutionContextDefinition<TType> => definition;
