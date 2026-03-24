/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart, Logger } from '@kbn/core/server';
import {
  WORKFLOWS_AI_EDIT_RESULT_EVENT_TYPE,
  type WorkflowsAiEditResultParams,
  workflowsAiEditResultSchema,
} from './events/workflows_ai_edit_result';

interface CompactValidation {
  valid: boolean;
  errors?: string[];
}

/**
 * Telemetry client for NL2Workflow (AI-assisted workflow authoring) server-side events.
 * Tracks edit tool outcomes, validation results, and self-correction patterns.
 */
export class WorkflowsAiTelemetryClient {
  private lastValidationFailed = new Map<string, boolean>();

  static setup(analytics: AnalyticsServiceSetup): void {
    analytics.registerEventType({
      eventType: WORKFLOWS_AI_EDIT_RESULT_EVENT_TYPE,
      schema: workflowsAiEditResultSchema,
    });
  }

  constructor(private readonly analytics: AnalyticsServiceStart, private readonly logger: Logger) {}

  reportEditResult(params: {
    toolId: string;
    conversationId?: string;
    editSuccess: boolean;
    isCreation: boolean;
    validation?: CompactValidation;
  }): void {
    const { toolId, conversationId, editSuccess, isCreation, validation } = params;

    let isSelfCorrection: boolean | undefined;

    if (validation && conversationId) {
      const prevFailed = this.lastValidationFailed.get(conversationId) ?? false;

      if (validation.valid && prevFailed) {
        isSelfCorrection = true;
      }

      this.lastValidationFailed.set(conversationId, !validation.valid);
    }

    try {
      const event: WorkflowsAiEditResultParams = {
        tool_id: toolId,
        edit_success: editSuccess,
        is_creation: isCreation,
        ...(conversationId ? { conversation_id: conversationId } : {}),
        ...(validation ? { validation_passed: validation.valid } : {}),
        ...(!validation?.valid && validation?.errors
          ? { validation_error_count: validation.errors.length }
          : {}),
        ...(isSelfCorrection !== undefined ? { is_self_correction: isSelfCorrection } : {}),
      };
      this.analytics.reportEvent(WORKFLOWS_AI_EDIT_RESULT_EVENT_TYPE, event);
    } catch (error) {
      this.logger.debug('Failed to report workflows_ai_edit_result telemetry event', { error });
    }
  }
}
