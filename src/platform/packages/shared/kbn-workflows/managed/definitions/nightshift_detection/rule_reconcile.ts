/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import RULE_RECONCILE_YAML from './rule_reconcile.yaml';
import { defineBoundWorkflow } from '../../define_bound_workflow';

export const NIGHTSHIFT_DETECTION_RULE_RECONCILE_WORKFLOW_ID =
  'system-nightshift-detection-rule-reconcile';

/**
 * Keeps the alerting rules of the detection strategies in a space up to date: started by the
 * engine's `nightshift-detection.rulesStale` trigger when knowledge indicators or sources change,
 * and every six hours. Installed per space and bound to the detection engine service account, it
 * calls `POST /internal/nightshift/detection/rules/_reconcile` as that account, so the rules run
 * with the account's API key.
 */
export const NIGHTSHIFT_DETECTION_RULE_RECONCILE_WORKFLOW = defineBoundWorkflow({
  id: NIGHTSHIFT_DETECTION_RULE_RECONCILE_WORKFLOW_ID,
  pluginId: 'nightshiftDetection',
  yaml: RULE_RECONCILE_YAML,
  version: 1,
});
