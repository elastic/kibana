/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SYNC_YAML from './sync.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../../types';
import { renderRunAs } from '../../nightshift_investigations/render_bound_yaml';

export const NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID = 'system-sources-ki-sync-bound';

/** Document id of the sync installed in a space (installed with `workflowIdSuffix`). */
export const getNightshiftBoundKiSyncWorkflowId = (spaceId: string): string =>
  `${NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID}-${spaceId}`;

export interface NightshiftBoundKiSyncTemplateValues extends ManagedWorkflowTemplateValues {
  /** The service account the detection engine runs as in the space. */
  serviceAccountId: string;
}

/** Renders the KI sync YAML with `settings.run_as` set to the bound service account. */
export const renderBoundSyncYaml = ({
  serviceAccountId,
}: NightshiftBoundKiSyncTemplateValues): string => renderRunAs(SYNC_YAML, serviceAccountId);

/**
 * The space's KI sync, installed per space by the space's setup and bound to the detection engine
 * service account, so its scheduled sweeps run as that account.
 */
export const NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yamlTemplate: renderBoundSyncYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundKiSyncTemplateValues>;
