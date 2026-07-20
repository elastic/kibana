/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SCHEDULED_DETECTION_YAML from './scheduled_detection.yaml';
import SCHEDULED_REVIEW_YAML from './scheduled_review.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID =
  'system-significant-events-scheduled-detection';
export const SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID =
  'system-significant-events-scheduled-review';

export interface SignificantEventsScheduledDetectionWorkflowTemplateValues
  extends ManagedWorkflowTemplateValues {
  detectionIntervalMinutes: number;
  detectionBucketIntervalMinutes: number;
  detectionLookbackMinutes: number;
  targetCoverageMinutes: number;
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

// yamlTemplate values are substituted into the static yaml files above via
// exact-token replacement, since values (e.g. batch sizes) are needed at
// workflow-install time rather than at workflow-run time and so can't be
// expressed with the engine's own `${{ }}` / `{{ }}` runtime templating.
const renderTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (yaml, [token, value]) => yaml.split(token).join(String(value)),
    template
  );

export const SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  pluginId: 'significant_events',
  version: 3,
  billable: false,
  // The change_point agg needs >= 22 buckets, so detectionLookbackMinutes must be an exact
  // multiple of detectionBucketIntervalMinutes with a quotient in [22, 1000] — the scheduled
  // discovery settings route validates the pair before installing.
  yamlTemplate: ({
    detectionIntervalMinutes,
    detectionBucketIntervalMinutes,
    detectionLookbackMinutes,
    targetCoverageMinutes,
  }) =>
    renderTemplate(SCHEDULED_DETECTION_YAML, {
      __DETECTION_INTERVAL_MINUTES__: detectionIntervalMinutes,
      __DETECTION_BUCKET_INTERVAL_MINUTES__: detectionBucketIntervalMinutes,
      __DETECTION_LOOKBACK_MINUTES__: detectionLookbackMinutes,
      __TARGET_COVERAGE_MINUTES__: targetCoverageMinutes,
    }),
  management: SCHEDULED_SIGNIFICANT_EVENTS_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<SignificantEventsScheduledDetectionWorkflowTemplateValues>;

export const SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
  pluginId: 'significant_events',
  version: 2,
  billable: false,
  yamlTemplate: ({ reviewIntervalMinutes, discoveryBatchSize, triageBatchSize, maxReviewPasses }) =>
    renderTemplate(SCHEDULED_REVIEW_YAML, {
      __REVIEW_INTERVAL_MINUTES__: reviewIntervalMinutes,
      __MAX_REVIEW_PASSES__: maxReviewPasses,
      __DISCOVERY_BATCH_SIZE__: discoveryBatchSize,
      __TRIAGE_BATCH_SIZE__: triageBatchSize,
    }),
  management: SCHEDULED_SIGNIFICANT_EVENTS_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<SignificantEventsScheduledReviewWorkflowTemplateValues>;
