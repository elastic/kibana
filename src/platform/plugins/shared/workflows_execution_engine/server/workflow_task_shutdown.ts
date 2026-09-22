/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export class WorkflowTaskManagerAbortError extends Error {
  constructor() {
    super('Workflow task aborted by Task Manager');
    this.name = 'WorkflowTaskManagerAbortError';
  }
}

export const isWorkflowTaskManagerAbortSignal = (signal: AbortSignal): boolean =>
  signal.reason instanceof WorkflowTaskManagerAbortError;

export const createWorkflowTaskAbortController = (
  taskManagerAbortSignal: AbortSignal
): AbortController => {
  const workflowAbortController = new AbortController();

  const abortWorkflow = () => {
    if (!workflowAbortController.signal.aborted) {
      workflowAbortController.abort(new WorkflowTaskManagerAbortError());
    }
  };

  if (taskManagerAbortSignal.aborted) {
    abortWorkflow();
    return workflowAbortController;
  }

  taskManagerAbortSignal.addEventListener('abort', abortWorkflow, { once: true });
  return workflowAbortController;
};
