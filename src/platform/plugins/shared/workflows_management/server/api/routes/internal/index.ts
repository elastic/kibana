/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerDisableAllWorkflowsRoute } from './disable';
import { registerGetConfigRoute } from './get_config';
import { registerGetDependentsImpactRoute } from './get_dependents_impact';
import { registerGetLinkedRulesRoute } from './get_linked_rules';
import { registerGetReadableWorkflowIdsRoute } from './get_readable_workflow_ids';
import { registerGetRemovalImpactRoute } from './get_removal_impact';
import { registerGetWorkflowHistoryRoute } from './get_workflow_history';
import { registerRestoreWorkflowVersionRoute } from './restore_workflow_version';
import { registerTriggerEventsLogRoutes } from './trigger_events_log';
import type { RouteDependencies } from '../types';

export function registerInternalRoutes(deps: RouteDependencies) {
  registerGetConfigRoute(deps);
  registerGetReadableWorkflowIdsRoute(deps);
  registerDisableAllWorkflowsRoute(deps);
  registerGetWorkflowHistoryRoute(deps);
  registerGetLinkedRulesRoute(deps);
  registerGetDependentsImpactRoute(deps);
  registerGetRemovalImpactRoute(deps);
  registerRestoreWorkflowVersionRoute(deps);
  registerTriggerEventsLogRoutes(deps);
}
