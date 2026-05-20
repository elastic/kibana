/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export class WorkflowTaskShutdownError extends Error {
  constructor() {
    super('Workflow task aborted because Task Manager is shutting down');
    this.name = 'WorkflowTaskShutdownError';
  }
}

export const isWorkflowTaskShutdownSignal = (signal: AbortSignal): boolean =>
  signal.reason instanceof WorkflowTaskShutdownError;

export const createWorkflowTaskAbortController = (
  taskManagerAbortController: AbortController
): AbortController => {
  const workflowAbortController = new AbortController();

  const abortWorkflow = () => {
    if (!workflowAbortController.signal.aborted) {
      workflowAbortController.abort(new WorkflowTaskShutdownError());
    }
  };

  if (taskManagerAbortController.signal.aborted) {
    abortWorkflow();
    return workflowAbortController;
  }

  taskManagerAbortController.signal.addEventListener('abort', abortWorkflow, { once: true });
  return workflowAbortController;
};
