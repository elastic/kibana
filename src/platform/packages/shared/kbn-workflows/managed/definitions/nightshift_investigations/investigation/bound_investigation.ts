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

export const NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID = 'system-nightshift-investigation-bound';

export interface NightshiftBoundInvestigationTemplateValues extends ManagedWorkflowTemplateValues {
  /** The service account the investigation runs as, e.g. `kibana/nightshift_investigator`. */
  serviceAccountId: string;
}

const SETTINGS_BLOCK = /^settings:\n/m;

/**
 * Renders the shared investigation YAML with `settings.run_as`, so a per-space install runs as
 * the bound service account instead of the user that starts the investigation.
 */
export const renderBoundInvestigationYaml = ({
  serviceAccountId,
}: NightshiftBoundInvestigationTemplateValues): string => {
  if (typeof serviceAccountId !== 'string' || serviceAccountId.trim().length === 0) {
    throw new Error('A bound Nightshift investigation requires a serviceAccountId');
  }
  if (!SETTINGS_BLOCK.test(INVESTIGATION_WORKFLOW_YAML)) {
    throw new Error('The investigation workflow YAML has no top-level settings block');
  }
  return INVESTIGATION_WORKFLOW_YAML.replace(
    SETTINGS_BLOCK,
    `settings:\n  run_as: ${JSON.stringify(serviceAccountId)}\n`
  );
};

/**
 * The investigation workflow, installed per space and bound to a service account. It shares its
 * YAML with the global `system-nightshift-investigation`, which keeps running as the caller.
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
