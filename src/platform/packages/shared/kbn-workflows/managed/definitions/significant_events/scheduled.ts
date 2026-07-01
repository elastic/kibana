/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID =
  'system-significant-events-scheduled-detection';
export const SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID =
  'system-significant-events-scheduled-review';

const SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID = 'system-significant-events-detection';
const SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID = 'system-significant-events-discovery';
const SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID = 'system-significant-events-triage';

export interface SignificantEventsScheduledDetectionWorkflowTemplateValues
  extends ManagedWorkflowTemplateValues {
  detectionIntervalMinutes: number;
}

export interface SignificantEventsScheduledReviewWorkflowTemplateValues
  extends ManagedWorkflowTemplateValues {
  reviewIntervalMinutes: number;
  discoveryBatchSize: number;
  triageBatchSize: number;
  maxReviewPasses: number;
}

const SCHEDULED_SIGNIFICANT_EVENTS_WORKFLOW_MANAGEMENT = {
  lifecycle: 'dynamic',
  versionStrategy: 'auto',
  enablement: 'restorable',
} as const;

const getDetectionLookbackMinutes = (detectionIntervalMinutes: number) =>
  Math.max(30, detectionIntervalMinutes);

const getReviewPasses = (maxReviewPasses: number): string => {
  const passes = Array.from({ length: maxReviewPasses }, (_, index) => index + 1);
  return `[${passes.join(',')}]`;
};

export const SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  pluginId: 'streams',
  version: 1,
  billable: false,
  yamlTemplate: ({ detectionIntervalMinutes }) => `version: "1"
name: "Significant Events Scheduled Detection"
description: "Runs Significant Events detection on a schedule for the current space."
enabled: false
tags:
  - observability
  - streams
  - significant-events
  - scheduled
  - detection
settings:
  timeout: "10m"
  concurrency:
    key: "significant-events-scheduled-detection"
    strategy: drop
    max: 1
triggers:
  - type: scheduled
    with:
      every: "${detectionIntervalMinutes}m"
  - type: manual
steps:
  - name: detect
    type: workflow.execute
    with:
      workflow-id: "${SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID}"
      inputs:
        lookback: "now-${getDetectionLookbackMinutes(detectionIntervalMinutes)}m"
`,
  management: SCHEDULED_SIGNIFICANT_EVENTS_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<SignificantEventsScheduledDetectionWorkflowTemplateValues>;

export const SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
  pluginId: 'streams',
  version: 1,
  billable: false,
  yamlTemplate: ({
    reviewIntervalMinutes,
    discoveryBatchSize,
    triageBatchSize,
    maxReviewPasses,
  }) => `version: "1"
name: "Significant Events Scheduled Review"
description: "Runs bounded Significant Events discovery and triage passes on a schedule for the current space."
enabled: false
tags:
  - observability
  - streams
  - significant-events
  - scheduled
  - review
settings:
  timeout: "40m"
  concurrency:
    key: "significant-events-scheduled-review"
    strategy: drop
    max: 1
  on-failure:
    continue: true
triggers:
  - type: scheduled
    with:
      every: "${reviewIntervalMinutes}m"
  - type: manual
steps:
  - name: run_review_passes
    type: foreach
    foreach: "${getReviewPasses(maxReviewPasses)}"
    iteration-on-failure:
      continue: true
    steps:
      - name: discover
        type: workflow.execute
        with:
          workflow-id: "${SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID}"
          inputs:
            detectionBatchMax: ${discoveryBatchSize}
        on-failure:
          continue: true

      - name: triage
        type: workflow.execute
        with:
          workflow-id: "${SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID}"
          inputs:
            discoveryBatchMax: ${triageBatchSize}
        on-failure:
          continue: true
`,
  management: SCHEDULED_SIGNIFICANT_EVENTS_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<SignificantEventsScheduledReviewWorkflowTemplateValues>;
