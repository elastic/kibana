/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SYNC_YAML from './bound_sync.yaml';
import { defineBoundWorkflow } from '../../../define_bound_workflow';

export const NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID = 'system-sources-ki-sync-bound';

/**
 * The space's KI sync, installed per space by the space's setup and bound to the detection engine
 * service account, so its scheduled sweeps run as that account.
 */
export const NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW = defineBoundWorkflow({
  id: NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  pluginId: 'significantEvents',
  yaml: SYNC_YAML,
  version: 1,
});
