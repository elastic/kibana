/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import BOUND_ORCHESTRATOR_YAML from './bound_orchestrator.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../../types';
import { renderRunAs } from '../../nightshift_investigations/render_bound_yaml';

export const NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID = 'system-nightshift-discovery-bound';

/** Document id of the entry point installed in a space (installed with `workflowIdSuffix`). */
export const getNightshiftBoundDiscoveryWorkflowId = (spaceId: string): string =>
  `${NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID}-${spaceId}`;

export interface NightshiftBoundDiscoveryTemplateValues extends ManagedWorkflowTemplateValues {
  /** The service account the detection engine runs as in the space. */
  serviceAccountId: string;
}

/** Renders the space entry point with `settings.run_as` set to the bound service account. */
export const renderBoundOrchestratorYaml = ({
  serviceAccountId,
}: NightshiftBoundDiscoveryTemplateValues): string =>
  renderRunAs(BOUND_ORCHESTRATOR_YAML, serviceAccountId);

/**
 * The space's entry point to detection and discovery, installed per space and bound to the
 * detection engine service account. It calls the shared orchestrator, which inherits its identity
 * and hands it to detection and discovery.
 */
export const NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yamlTemplate: renderBoundOrchestratorYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundDiscoveryTemplateValues>;
