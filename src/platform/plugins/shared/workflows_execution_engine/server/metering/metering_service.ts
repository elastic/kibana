/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';

import {
  BUCKET_SIZE_MS,
  METERING_RETRY_ATTEMPTS,
  METERING_RETRY_BASE_DELAY_MS,
  METERING_SOURCE_ID,
  WORKFLOWS_USAGE_TYPE,
} from './constants';
import type { UsageRecord } from './types';
import type { UsageReportingService } from './usage_reporting_service';

/**
 * Workflows Metering Service - Stage 1 of the billing pipeline.
 *
 * Builds UsageRecords from completed workflow executions and sends them
 * to the Usage API. Uses event-based metering: reports immediately after
 * each workflow reaches a terminal state (fire-and-forget with inline retry).
 *
 * Key design decisions:
 * - quantity=1 for each execution (simple count). Transform function decides billing.
 * - Rich metadata (duration, status, step_types, etc.) for flexible pricing logic.
 * - Deduplication via deterministic ID: `workflow-execution-{executionId}`.
 * - Supports both Serverless (projectId) and ECH (deploymentId).
 */
export class WorkflowsMeteringService {
  constructor(
    private readonly usageReportingService: UsageReportingService,
    private readonly logger: Logger
  ) {}

  /**
   * Reports a workflow execution to the Usage API.
   *
   * Callers should NOT await this -- it is designed to be fire-and-forget.
   * All errors are caught and logged internally. Returning a Promise enables
   * tests to await completion without needing fake timers.
   */
  public async reportWorkflowExecution(
    execution: EsWorkflowExecution,
    cloudSetup?: CloudSetup
  ): Promise<void> {
    const projectId = cloudSetup?.serverless?.projectId;
    const deploymentId = cloudSetup?.deploymentId;
    const instanceGroupId = projectId || deploymentId;

    // Self-managed: no metering (no projectId or deploymentId available)
    if (!instanceGroupId) {
      return;
    }

    // Only report for terminal states; skip SKIPPED executions since they
    // were dropped by concurrency limits and never actually ran.
    if (!isTerminalStatus(execution.status as ExecutionStatus)) {
      return;
    }
    if (execution.status === ExecutionStatus.SKIPPED) {
      return;
    }

    const usageRecord = this.buildUsageRecord(execution, instanceGroupId);

    try {
      await this.sendWithRetry(usageRecord);
    } catch (err) {
      // Log with billing-relevant details per monitoring requirements:
      // project ID, type, and count for impact assessment
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to report workflow metering for execution ${execution.id} ` +
          `(instanceGroupId=${instanceGroupId}, type=${WORKFLOWS_USAGE_TYPE}, quantity=1): ${errorMessage}`
      );
    }
  }

  /**
   * Builds a UsageRecord from a completed workflow execution.
   *
   * The record follows Usage Record Schema v2. Kibana (Stage 1) sends raw data;
   * the transform function (Stage 3) decides what's billable and how to price it.
   */
  private buildUsageRecord(execution: EsWorkflowExecution, instanceGroupId: string): UsageRecord {
    const durationMs = execution.duration || 0;
    const durationMinutes = Math.ceil(durationMs / 60000);
    const normalizedQuantity = Math.max(1, Math.ceil(durationMs / BUCKET_SIZE_MS));
    const stepTypes = this.extractStepTypes(execution);
    const stepCount = Object.values(stepTypes).reduce((sum, count) => sum + count, 0);

    const metadata: Record<string, string> = {
      duration_ms: String(durationMs),
      duration_minutes: String(durationMinutes),
      normalized_quantity: String(normalizedQuantity),
      status: execution.status,
      triggered_by: execution.triggeredBy || 'unknown',
      is_test_run: String(execution.isTestRun),
      workflow_id: execution.workflowId,
      space_id: execution.spaceId,
      step_count: String(stepCount),
    };

    if (Object.keys(stepTypes).length > 0) {
      metadata.step_types = JSON.stringify(stepTypes);
    }

    return {
      id: `workflow-execution-${execution.id}`,
      usage_timestamp: execution.finishedAt || new Date().toISOString(),
      creation_timestamp: new Date().toISOString(),
      usage: {
        type: WORKFLOWS_USAGE_TYPE,
        quantity: 1,
        period_seconds: Math.ceil(durationMs / 1000) || 1,
        metadata,
      },
      source: {
        id: METERING_SOURCE_ID,
        instance_group_id: instanceGroupId,
      },
    };
  }

  /**
   * Extracts a breakdown of step types from the workflow definition.
   * Returns a map of step type -> count (e.g., { connector: 5, transform: 3, ai: 2 }).
   */
  private extractStepTypes(execution: EsWorkflowExecution): Record<string, number> {
    const stepTypes: Record<string, number> = {};

    const steps = execution.workflowDefinition?.steps;
    if (!steps || !Array.isArray(steps)) {
      return stepTypes;
    }

    for (const step of steps) {
      const stepType = step?.type || 'unknown';
      stepTypes[stepType] = (stepTypes[stepType] || 0) + 1;
    }

    return stepTypes;
  }

  /**
   * Sends a usage record with inline retry and exponential backoff.
   * Per billing team guidance: data loss is preferable to overbilling,
   * so we retry a few times then give up (logged at error level).
   */
  private async sendWithRetry(record: UsageRecord): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < METERING_RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await this.usageReportingService.reportUsage([record]);

        if (response.ok) {
          this.logger.debug(
            `Successfully reported metering for execution ${record.id} (attempt ${attempt + 1})`
          );
          return;
        }

        lastError = new Error(`Usage API responded with status ${response.status}`);
        this.logger.warn(
          `Metering report attempt ${attempt + 1}/${METERING_RETRY_ATTEMPTS} failed: ${
            lastError.message
          }`
        );
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `Metering report attempt ${attempt + 1}/${METERING_RETRY_ATTEMPTS} failed: ${
            lastError.message
          }`
        );
      }

      // Exponential backoff before next retry (skip delay on last attempt)
      if (attempt < METERING_RETRY_ATTEMPTS - 1) {
        await this.delay(METERING_RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
      }
    }

    throw lastError || new Error('Metering report failed after all retry attempts');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
