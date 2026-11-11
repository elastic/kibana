/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ORCHESTRATOR_YAML from './bound_orchestrator.yaml';
import { defineBoundWorkflow } from '../../../define_bound_workflow';

export const NIGHTSHIFT_BOUND_ORCHESTRATOR_WORKFLOW_ID = 'system-nightshift-orchestrator-bound';

/**
 * The space's entry point to detection and discovery, installed per space and bound to the
 * detection engine service account. It runs detection and discovery itself, as child workflows
 * that inherit its identity.
 */
export const NIGHTSHIFT_BOUND_ORCHESTRATOR_WORKFLOW = defineBoundWorkflow({
  id: NIGHTSHIFT_BOUND_ORCHESTRATOR_WORKFLOW_ID,
  pluginId: 'significantEvents',
  yaml: ORCHESTRATOR_YAML,
  version: 1,
});
