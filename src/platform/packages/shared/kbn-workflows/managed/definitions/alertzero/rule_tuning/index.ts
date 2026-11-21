/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
} from './rule_tuning_workflows';

export {
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
} from './detection_rule_tuning';
export {
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
} from './rule_tuning_workflows';

/** Installed globally; each inherits the starting workflow's space at run time. */
export const ALERTZERO_RULE_TUNING_CHILD_WORKFLOW_IDS = [
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
] as const;
