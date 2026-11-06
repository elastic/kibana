/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import INVESTIGATION_COMPLETED_YAML from './bound_investigation_completed.yaml';
import { defineBoundWorkflow } from '../../define_bound_workflow';

export const NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID =
  'system-nightshift-investigation-completed-bound';

/**
 * Attaches a space's finished investigations to their significant event as the detection engine
 * service account. Installed per space, in place of the global workflow.
 */
export const NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW = defineBoundWorkflow({
  id: NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID,
  pluginId: 'significantEvents',
  yaml: INVESTIGATION_COMPLETED_YAML,
  version: 1,
});
