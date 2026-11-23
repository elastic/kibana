/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import RECONCILE_YAML from './reconcile.yaml';
import { defineBoundWorkflow } from '../../define_bound_workflow';

export const NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW_ID = 'system-nightshift-detection-reconcile';

/**
 * The `triggeredBy` of a run the detection engine starts when a source changes. Not a registered
 * trigger: the engine passes it to `runWorkflow` from server code, which no HTTP caller can set.
 */
export const NIGHTSHIFT_DETECTION_SOURCE_CHANGED = 'nightshift-detection.sourceChanged';

/**
 * Keeps what the detection strategies need in a space, today their alerting rules, up to date:
 * started by `significant-events.knowledgeIndicatorsChanged` when knowledge indicators change, by
 * the engine itself when a source changes, and every six hours to catch a change whose start was
 * lost.
 * Installed per space and bound to the detection engine service account, it calls
 * `POST /internal/nightshift/detection/_reconcile` as that account, so the rules run with the
 * account's API key.
 */
export const NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW = defineBoundWorkflow({
  id: NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW_ID,
  pluginId: 'nightshiftDetection',
  yaml: RECONCILE_YAML,
  version: 1,
});
