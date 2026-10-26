/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import BOUND_INVESTIGATION_WORKFLOW_YAML from './bound_investigation_workflow.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../../types';
import { renderRunAs } from '../render_bound_yaml';

export const NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID = 'system-nightshift-investigation-bound';

/**
 * `triggeredBy` of every run of the entry point that Nightshift's investigations client starts.
 * The entry point fails any other run, so starting an investigation as the service account goes
 * through the client and its checks rather than the generic workflow run API. Only server code
 * sets `triggeredBy`.
 */
export const NIGHTSHIFT_INVESTIGATIONS_TRIGGER_SOURCE = 'nightshift-investigations';

/** Document id of the bound investigation installed in a space (installed with `workflowIdSuffix`). */
export const getNightshiftBoundInvestigationWorkflowId = (spaceId: string): string =>
  `${NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID}-${spaceId}`;

export interface NightshiftBoundInvestigationTemplateValues extends ManagedWorkflowTemplateValues {
  /** The service account the investigation runs as, e.g. `kibana/nightshift_agent`. */
  serviceAccountId: string;
}

/** Renders the space entry point with `settings.run_as` set to the bound service account. */
export const renderBoundInvestigationYaml = ({
  serviceAccountId,
}: NightshiftBoundInvestigationTemplateValues): string =>
  renderRunAs(BOUND_INVESTIGATION_WORKFLOW_YAML, serviceAccountId);

/**
 * The space's entry point to investigations, installed per space and bound to the Nightshift
 * service account. It calls the global investigation workflow, which inherits its identity, so a
 * change to the investigation only updates the one global copy. A space without this entry point
 * cannot run investigations.
 *
 * It refuses runs the investigations client did not start (`NIGHTSHIFT_INVESTIGATIONS_TRIGGER_SOURCE`):
 * the client checks the caller's privileges, claims the subjects and creates the investigation,
 * none of which a direct run of the workflow would do.
 */
export const NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yamlTemplate: renderBoundInvestigationYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundInvestigationTemplateValues>;
