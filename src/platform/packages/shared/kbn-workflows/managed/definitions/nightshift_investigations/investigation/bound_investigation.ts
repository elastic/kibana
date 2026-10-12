/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import INVESTIGATION_WORKFLOW_YAML from './investigation_workflow.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../../types';
import { renderRunAs } from '../render_bound_yaml';

export const NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID = 'system-nightshift-investigation-bound';

/** Document id of the bound investigation installed in a space (installed with `workflowIdSuffix`). */
export const getNightshiftBoundInvestigationWorkflowId = (spaceId: string): string =>
  `${NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID}-${spaceId}`;

export interface NightshiftBoundInvestigationTemplateValues extends ManagedWorkflowTemplateValues {
  /** The service account the investigation runs as, e.g. `kibana/nightshift_investigator`. */
  serviceAccountId: string;
}

/** Renders the investigation YAML with `settings.run_as` set to the bound service account. */
export const renderBoundInvestigationYaml = ({
  serviceAccountId,
}: NightshiftBoundInvestigationTemplateValues): string =>
  renderRunAs(INVESTIGATION_WORKFLOW_YAML, serviceAccountId);

/**
 * The investigation workflow, installed per space and bound to the Nightshift service account.
 * Investigations only run through this copy; a space without it cannot run investigations.
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
