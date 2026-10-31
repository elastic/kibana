/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import CLEANUP_YAML from './cleanup.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';
import { renderRunAs } from '../nightshift_investigations/render_bound_yaml';

export const NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID = 'system-nightshift-cleanup-bound';

/** Document id of the cleanup installed in a space (installed with `workflowIdSuffix`). */
export const getNightshiftBoundCleanupWorkflowId = (spaceId: string): string =>
  `${NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID}-${spaceId}`;

export interface NightshiftBoundCleanupTemplateValues extends ManagedWorkflowTemplateValues {
  /** The service account the detection engine runs as in the space. */
  serviceAccountId: string;
}

/** Renders the cleanup YAML with `settings.run_as` set to the bound service account. */
export const renderBoundCleanupYaml = ({
  serviceAccountId,
}: NightshiftBoundCleanupTemplateValues): string => renderRunAs(CLEANUP_YAML, serviceAccountId);

/**
 * The space's stale event cleanup, installed per space by the space's setup and bound to the
 * detection engine service account, so its daily sweep runs as that account.
 */
export const NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yamlTemplate: renderBoundCleanupYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundCleanupTemplateValues>;
