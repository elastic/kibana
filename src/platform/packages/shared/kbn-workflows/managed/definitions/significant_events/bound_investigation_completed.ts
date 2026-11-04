/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import INVESTIGATION_COMPLETED_YAML from './investigation_completed.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';
import { renderRunAs } from '../nightshift_investigations/render_bound_yaml';

export const NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID =
  'system-nightshift-investigation-completed-bound';

/** Document id of the workflow installed in a space (installed with `workflowIdSuffix`). */
export const getNightshiftBoundInvestigationCompletedWorkflowId = (spaceId: string): string =>
  `${NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID}-${spaceId}`;

export interface NightshiftBoundInvestigationCompletedTemplateValues
  extends ManagedWorkflowTemplateValues {
  /** The service account the detection engine runs as in the space. */
  serviceAccountId: string;
}

/** Renders the investigation completed YAML with `settings.run_as` set to the bound service account. */
export const renderBoundInvestigationCompletedYaml = ({
  serviceAccountId,
}: NightshiftBoundInvestigationCompletedTemplateValues): string =>
  renderRunAs(INVESTIGATION_COMPLETED_YAML, serviceAccountId);

/**
 * The space's write-back of a finished investigation to its significant event, installed per space
 * by the space's setup and bound to the detection engine service account, so the write runs as that
 * account.
 */
export const NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yamlTemplate: renderBoundInvestigationCompletedYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundInvestigationCompletedTemplateValues>;
