/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExternalServiceApiHandlerArgs, WorkflowsExecutorResultData } from './types';

const run = async ({
  externalService,
  params,
  logger,
}: ExternalServiceApiHandlerArgs): Promise<WorkflowsExecutorResultData> => {
  // Skip workflow execution if there are no alerts (similar to Cases pattern)
  const alerts = params.inputs?.event?.alerts;
  if (!alerts || alerts.length === 0) {
    logger.debug(
      `[WorkflowsConnector][run] No alerts. Skipping workflow execution for workflowId: ${params.workflowId}`
    );

    return {
      workflowRunId: 'skipped-no-alerts',
      status: 'skipped',
    };
  }

  const { workflowId, spaceId, inputs, summaryMode = true } = params;
  const originalEvent = inputs.event;
  const { rule, ruleUrl, spaceId: eventSpaceId } = originalEvent;

  // Summary mode: execute workflow once with all alerts
  if (summaryMode) {
    const res = await externalService.runWorkflow({ workflowId, spaceId, inputs });
    return { workflowRunId: res.workflowRunId, status: res.status };
  }

  // Per-alert mode: schedule workflow for each alert individually
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < alerts.length; i++) {
    const singleAlert = alerts[i];
    try {
      // Create a new event structure with a single alert
      const singleAlertEvent = {
        event: {
          alerts: [singleAlert],
          rule,
          ruleUrl,
          spaceId: eventSpaceId,
        },
      };

      const workflowRunId = await externalService.scheduleWorkflow({
        workflowId,
        spaceId,
        inputs: singleAlertEvent,
      });

      successCount++;

      logger.debug(
        `[WorkflowsConnector][run] Scheduled workflow for alert ${i + 1}/${
          alerts.length
        }, workflowRunId: ${workflowRunId}`
      );
    } catch (error) {
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        `[WorkflowsConnector][run] Failed to schedule workflow for alert ${i + 1}/${
          alerts.length
        }: ${errorMessage}`
      );
    }
  }

  if (errorCount > 0) {
    logger.warn(
      `[WorkflowsConnector][run] Completed per-alert scheduling with ${errorCount} error(s) out of ${alerts.length} alert(s)`
    );
    return {
      workflowRunId: `per-alert-scheduling-${successCount}-success-${errorCount}-errors`,
      status: errorCount === alerts.length ? 'failed' : 'partial',
    };
  }

  return {
    workflowRunId: `per-alert-scheduling-${successCount}-success`,
    status: 'scheduled',
  };
};

export const api = {
  run,
} as const;
