/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from './use_kibana';
import { WorkflowsBaseTelemetry } from '../common/service/telemetry';

let telemetryInstance: WorkflowsBaseTelemetry | null = null;

/**
 * Hook to access workflow telemetry service
 */
export function useTelemetry(): WorkflowsBaseTelemetry {
  const services = useKibana().services;
  const workflowsManagement = services.workflowsManagement;

  if (!workflowsManagement?.telemetry) {
    // Return a no-op instance if telemetry is not available
    if (!telemetryInstance) {
      telemetryInstance = new WorkflowsBaseTelemetry({
        reportEvent: () => {
          // No-op if telemetry is not available
        },
      });
    }
    return telemetryInstance;
  }

  // Create or reuse telemetry instance
  if (!telemetryInstance) {
    telemetryInstance = new WorkflowsBaseTelemetry(workflowsManagement.telemetry);
  }

  return telemetryInstance;
}
