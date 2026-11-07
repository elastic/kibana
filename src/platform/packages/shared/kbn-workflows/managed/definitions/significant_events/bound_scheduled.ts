/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SCHEDULED_DETECTION_YAML from './bound_scheduled_detection.yaml';
import SCHEDULED_REVIEW_YAML from './bound_scheduled_review.yaml';
import { renderRunAs, renderTemplate } from '../../render_bound_yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID =
  'system-nightshift-scheduled-detection-bound';
export const NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID =
  'system-nightshift-scheduled-review-bound';

/** Template values of the scheduled detection workflow. */
export interface NightshiftBoundScheduledDetectionTemplateValues
  extends ManagedWorkflowTemplateValues {
  /** The service account the detection engine runs as in the space. */
  serviceAccountId: string;
  detectionIntervalMinutes: number;
  detectionBucketIntervalMinutes: number;
  detectionLookbackMinutes: number;
  targetCoverageMinutes: number;
}

/** Template values of the scheduled review workflow. */
export interface NightshiftBoundScheduledReviewTemplateValues
  extends ManagedWorkflowTemplateValues {
  /** The service account the detection engine runs as in the space. */
  serviceAccountId: string;
  reviewIntervalMinutes: number;
  discoveryBatchSize: number;
  maxReviewPasses: number;
  flakyRuleDetectionThreshold: number;
  flakyRuleProbeAfterMinutes: number;
  flakyRuleExemptSeverityScore: number;
}

// Installed per space by the scheduled discovery setting, bound to the space's detection engine
// service account. The detection and discovery runs they start inherit that account.
const NIGHTSHIFT_BOUND_SCHEDULED_WORKFLOW_MANAGEMENT = {
  lifecycle: 'dynamic',
  versionStrategy: 'auto',
  enablement: 'restorable',
} as const;

/** Scheduled detection, installed per space and bound to its detection engine account. */
export const NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  // The change_point agg needs >= 22 buckets, so detectionLookbackMinutes must be an exact
  // multiple of detectionBucketIntervalMinutes with a quotient in [22, 1000] — the scheduled
  // discovery settings route validates the pair before installing.
  yamlTemplate: ({
    serviceAccountId,
    detectionIntervalMinutes,
    detectionBucketIntervalMinutes,
    detectionLookbackMinutes,
    targetCoverageMinutes,
  }) =>
    renderRunAs(
      renderTemplate(SCHEDULED_DETECTION_YAML, {
        __DETECTION_INTERVAL_MINUTES__: detectionIntervalMinutes,
        __DETECTION_BUCKET_INTERVAL_MINUTES__: detectionBucketIntervalMinutes,
        __DETECTION_LOOKBACK_MINUTES__: detectionLookbackMinutes,
        __TARGET_COVERAGE_MINUTES__: targetCoverageMinutes,
      }),
      serviceAccountId
    ),
  management: NIGHTSHIFT_BOUND_SCHEDULED_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundScheduledDetectionTemplateValues>;

/** Scheduled review and discovery, installed per space and bound to its detection engine account. */
export const NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yamlTemplate: ({
    serviceAccountId,
    reviewIntervalMinutes,
    discoveryBatchSize,
    maxReviewPasses,
    flakyRuleDetectionThreshold,
    flakyRuleProbeAfterMinutes,
    flakyRuleExemptSeverityScore,
  }) =>
    renderRunAs(
      renderTemplate(SCHEDULED_REVIEW_YAML, {
        __REVIEW_INTERVAL_MINUTES__: reviewIntervalMinutes,
        __MAX_REVIEW_PASSES__: maxReviewPasses,
        __DISCOVERY_BATCH_SIZE__: discoveryBatchSize,
        __FLAKY_RULE_DETECTION_THRESHOLD__: flakyRuleDetectionThreshold,
        __FLAKY_RULE_PROBE_AFTER_MINUTES__: flakyRuleProbeAfterMinutes,
        __FLAKY_RULE_EXEMPT_SEVERITY_SCORE__: flakyRuleExemptSeverityScore,
      }),
      serviceAccountId
    ),
  management: NIGHTSHIFT_BOUND_SCHEDULED_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundScheduledReviewTemplateValues>;
