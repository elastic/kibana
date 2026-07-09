/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CreateExecutionsDataAccessDeps,
  CreateStepExecutionsDataAccessDeps,
  CreateWorkflowExecutionsDataAccessDeps,
  ExecutionStorageSource,
} from '../types';

export const validateCreateExecutionsDataAccessParams = (
  deps: CreateExecutionsDataAccessDeps
): void => {
  if (deps.source === 'data_stream' && deps.dataStreamClient === undefined) {
    throw new Error(
      'dataStreamClient is required when creating executions data access with source "data_stream"'
    );
  }
};

export const validateCreateWorkflowExecutionsDataAccessParams = (
  deps: CreateWorkflowExecutionsDataAccessDeps
): void => {
  validateCreateExecutionsDataAccessParams(deps);
};

export const validateCreateStepExecutionsDataAccessParams = (
  params: CreateStepExecutionsDataAccessDeps
): void => {
  validateCreateExecutionsDataAccessParams(params);
};

export const createUnsupportedStorageSourceError = (
  entity: 'WorkflowExecutionsDataAccess' | 'StepExecutionsDataAccess' | 'ExecutionsDataAccess',
  source: ExecutionStorageSource
): Error => {
  return new Error(`${entity} for source "${source}" is not implemented yet`);
};
