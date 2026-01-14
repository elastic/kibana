/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WORKFLOWS_EXECUTION_STARTED,
  workflowExecutionEventNames,
  WorkflowsExecutionEventTypes,
} from './events/workflows';
import { WorkflowsTelemetryClient } from './workflows_telemetry_client';

export class WorkflowExecutionTelemetryClient extends WorkflowsTelemetryClient {
  public reportWorkflowExecutionStarted(params: {
    workflowId: string;
    workflowExecutionId: string;
  }): void {
    const { workflowId, workflowExecutionId } = params;
    this.reportEvent(WORKFLOWS_EXECUTION_STARTED, {
      workflowId,
      workflowExecutionId,
      eventName: workflowExecutionEventNames[WorkflowsExecutionEventTypes.WorkflowExecutionStarted],
    });
  }
}

