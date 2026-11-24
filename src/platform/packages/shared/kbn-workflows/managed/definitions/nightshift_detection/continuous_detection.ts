/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import CONTINUOUS_DETECTION_YAML from './continuous_detection.yaml';
import { defineBoundWorkflow } from '../../define_bound_workflow';

export const NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW_ID = 'system-nightshift-continuous-detection';

/**
 * Keeps detection running in a space: a one-minute schedule that runs one detection engine tick,
 * installed per space and bound to the detection engine service account. It calls
 * `POST /internal/nightshift/detection/_tick` as that account, so the tick reads customer data
 * with the account's role.
 */
export const NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW = defineBoundWorkflow({
  id: NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW_ID,
  pluginId: 'nightshiftDetection',
  yaml: CONTINUOUS_DETECTION_YAML,
  version: 1,
});
