/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import CLEANUP_YAML from './bound_cleanup.yaml';
import { defineBoundWorkflow } from '../../define_bound_workflow';

export const NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID = 'system-nightshift-cleanup-bound';

/**
 * The space's stale event cleanup, installed per space by the space's setup and bound to the
 * detection engine service account, so its daily sweep runs as that account.
 */
export const NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW = defineBoundWorkflow({
  id: NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  pluginId: 'significantEvents',
  yaml: CLEANUP_YAML,
  version: 1,
});
