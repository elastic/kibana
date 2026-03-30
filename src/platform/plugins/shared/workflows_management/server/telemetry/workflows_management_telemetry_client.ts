/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart, Logger } from '@kbn/core/server';
import {
  type TriggerEventDispatchedTelemetryEvent,
  WORKFLOWS_TRIGGER_EVENT_DISPATCHED,
} from './events';

interface WorkflowsManagementTelemetryClientDeps {
  logger: Logger;
  getAnalytics?: () => AnalyticsServiceStart | undefined;
}

export class WorkflowsManagementTelemetryClient {
  constructor(private readonly deps: WorkflowsManagementTelemetryClientDeps) {}

  reportTriggerEventDispatched(event: TriggerEventDispatchedTelemetryEvent): void {
    try {
      this.deps.getAnalytics?.()?.reportEvent(WORKFLOWS_TRIGGER_EVENT_DISPATCHED, event);
    } catch (error) {
      this.deps.logger.warn(
        `Failed to report ${WORKFLOWS_TRIGGER_EVENT_DISPATCHED} telemetry: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
