/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowActionsTelemetry } from '@kbn/workflows-ui';
import { useTelemetry } from './use_telemetry';

export const useWorkflowActionsTelemetry = (): WorkflowActionsTelemetry => {
  const telemetry = useTelemetry();

  return {
    reportWorkflowUpdated: (params) => telemetry.reportWorkflowUpdated(params),
    reportWorkflowDeleted: (params) => telemetry.reportWorkflowDeleted(params),
    reportWorkflowRunInitiated: (params) => telemetry.reportWorkflowRunInitiated(params),
    reportWorkflowStepTestRunInitiated: (params) =>
      telemetry.reportWorkflowStepTestRunInitiated(params),
    reportWorkflowCloned: (params) => telemetry.reportWorkflowCloned(params),
  };
};
