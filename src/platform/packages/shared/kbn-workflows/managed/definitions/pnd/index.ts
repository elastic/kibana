/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PND_RULE_CREATION_WORKFLOW,
  PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW,
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW,
  PND_RULE_TUNING_WORKFLOW_ID,
} from './rule_workflows';
import {
  PND_WATCH_AUTO_APPROVER_WORKFLOW,
  PND_WATCH_AUTO_APPROVER_WORKFLOW_ID,
} from './watch_auto_approver';
import { PND_WATCH_DARK_WORKFLOW, PND_WATCH_DARK_WORKFLOW_ID } from './watch_dark';
import { PND_WATCH_DEEP_WORKFLOW, PND_WATCH_DEEP_WORKFLOW_ID } from './watch_deep';
import { PND_WATCH_DETECTION_WORKFLOW, PND_WATCH_DETECTION_WORKFLOW_ID } from './watch_detection';
import { PND_WATCH_FLOOR_WORKFLOW, PND_WATCH_FLOOR_WORKFLOW_ID } from './watch_floor';
import { PND_WATCH_OFFICER_WORKFLOW, PND_WATCH_OFFICER_WORKFLOW_ID } from './watch_officer';
import {
  PND_WATCH_POST_INCIDENT_WORKFLOW,
  PND_WATCH_POST_INCIDENT_WORKFLOW_ID,
} from './watch_post_incident';
import type { PndWatchTemplateValues } from './watch_template_values';

export {
  PND_RULE_CREATION_WORKFLOW,
  PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW,
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW,
  PND_RULE_TUNING_WORKFLOW_ID,
} from './rule_workflows';
export {
  PND_WATCH_AUTO_APPROVER_WORKFLOW,
  PND_WATCH_AUTO_APPROVER_WORKFLOW_ID,
} from './watch_auto_approver';
export { PND_WATCH_DARK_WORKFLOW, PND_WATCH_DARK_WORKFLOW_ID } from './watch_dark';
export { PND_WATCH_DEEP_WORKFLOW, PND_WATCH_DEEP_WORKFLOW_ID } from './watch_deep';
export { PND_WATCH_DETECTION_WORKFLOW, PND_WATCH_DETECTION_WORKFLOW_ID } from './watch_detection';
export { PND_WATCH_FLOOR_WORKFLOW, PND_WATCH_FLOOR_WORKFLOW_ID } from './watch_floor';
export { PND_WATCH_OFFICER_WORKFLOW, PND_WATCH_OFFICER_WORKFLOW_ID } from './watch_officer';
export {
  PND_WATCH_POST_INCIDENT_WORKFLOW,
  PND_WATCH_POST_INCIDENT_WORKFLOW_ID,
} from './watch_post_incident';
export {
  readCorrelationIdFromEvent,
  readCorrelationIdFromExecutionContext,
} from './read_correlation_id_from_event';
export type { PndWatchTemplateValues } from './watch_template_values';

/** Catalog watches: dynamic, per-space, not installed at boot. 5th is Post-Incident, not Detection. */
export const PND_MANAGED_WATCH_WORKFLOW_IDS = [
  PND_WATCH_FLOOR_WORKFLOW_ID,
  PND_WATCH_OFFICER_WORKFLOW_ID,
  PND_WATCH_DARK_WORKFLOW_ID,
  PND_WATCH_DEEP_WORKFLOW_ID,
  PND_WATCH_POST_INCIDENT_WORKFLOW_ID,
] as const;

export const PND_RULE_WORKFLOW_IDS = [
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID,
  PND_RULE_CREATION_WORKFLOW_ID,
] as const;

/** Static global helpers installed at boot. Detection is #283488's orchestrator, not a catalog watch. */
export const PND_STATIC_HELPER_WORKFLOW_IDS = [
  ...PND_RULE_WORKFLOW_IDS,
  PND_WATCH_DETECTION_WORKFLOW_ID,
  PND_WATCH_AUTO_APPROVER_WORKFLOW_ID,
] as const;

export const PND_WATCH_WORKFLOWS = [
  PND_WATCH_FLOOR_WORKFLOW,
  PND_WATCH_OFFICER_WORKFLOW,
  PND_WATCH_DARK_WORKFLOW,
  PND_WATCH_DEEP_WORKFLOW,
  PND_WATCH_DETECTION_WORKFLOW,
  PND_WATCH_POST_INCIDENT_WORKFLOW,
] as const;

export const PND_WORKFLOWS = [
  ...PND_WATCH_WORKFLOWS,
  PND_RULE_PREVIEW_WORKFLOW,
  PND_RULE_TUNING_WORKFLOW,
  PND_RULE_CREATION_WORKFLOW,
  PND_WATCH_AUTO_APPROVER_WORKFLOW,
] as const;

export type PndWorkflowId = (typeof PND_WORKFLOWS)[number]['id'];

/**
 * Every PND watch and worker id. Not the resume allow-list — that is
 * `SYSTEM_SECURITY_WATCH_IDS` / `PND_WATCH_WORKFLOW_IDS` in `@kbn/pnd-common`.
 */
export const PND_WATCH_WORKFLOW_IDS = [
  PND_WATCH_FLOOR_WORKFLOW_ID,
  PND_WATCH_OFFICER_WORKFLOW_ID,
  PND_WATCH_DARK_WORKFLOW_ID,
  PND_WATCH_DEEP_WORKFLOW_ID,
  PND_WATCH_DETECTION_WORKFLOW_ID,
  PND_WATCH_POST_INCIDENT_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID,
  PND_RULE_CREATION_WORKFLOW_ID,
] as const;

/** Static `pluginId: 'pnd'` definitions installed at boot. Dynamic catalog watches are absent. */
export const PND_INSTALLABLE_WORKFLOW_IDS: readonly PndWorkflowId[] = PND_WORKFLOWS.filter(
  ({ management, pluginId }) => pluginId === 'pnd' && management.lifecycle === 'static'
).map(({ id }) => id);

export const PND_WORKFLOW_TEMPLATE_VALUES: PndWatchTemplateValues = {
  autonomyLevel: 'manual',
  settingsVersion: 1,
};

export const PND_WORKFLOW_TEMPLATE_VALUES_BY_ID: Record<
  PndWorkflowId,
  typeof PND_WORKFLOW_TEMPLATE_VALUES
> = {
  [PND_RULE_CREATION_WORKFLOW_ID]: PND_WORKFLOW_TEMPLATE_VALUES,
  [PND_RULE_PREVIEW_WORKFLOW_ID]: PND_WORKFLOW_TEMPLATE_VALUES,
  [PND_RULE_TUNING_WORKFLOW_ID]: PND_WORKFLOW_TEMPLATE_VALUES,
  [PND_WATCH_AUTO_APPROVER_WORKFLOW_ID]: PND_WORKFLOW_TEMPLATE_VALUES,
  [PND_WATCH_DARK_WORKFLOW_ID]: PND_WORKFLOW_TEMPLATE_VALUES,
  [PND_WATCH_DEEP_WORKFLOW_ID]: PND_WORKFLOW_TEMPLATE_VALUES,
  [PND_WATCH_DETECTION_WORKFLOW_ID]: PND_WORKFLOW_TEMPLATE_VALUES,
  [PND_WATCH_FLOOR_WORKFLOW_ID]: PND_WORKFLOW_TEMPLATE_VALUES,
  [PND_WATCH_OFFICER_WORKFLOW_ID]: PND_WORKFLOW_TEMPLATE_VALUES,
  [PND_WATCH_POST_INCIDENT_WORKFLOW_ID]: PND_WORKFLOW_TEMPLATE_VALUES,
};
