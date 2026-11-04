/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SOURCE_RECONCILIATION_YAML from './source_reconciliation.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../../types';
import { renderRunAs } from '../../nightshift_investigations/render_bound_yaml';

export const NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID =
  'system-nightshift-source-reconciliation-bound';

/** Document id of the source reconciliation installed in a space (with `workflowIdSuffix`). */
export const getNightshiftBoundSourceReconciliationWorkflowId = (spaceId: string): string =>
  `${NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID}-${spaceId}`;

export interface NightshiftBoundSourceReconciliationTemplateValues
  extends ManagedWorkflowTemplateValues {
  /** The service account the detection engine runs as in the space. */
  serviceAccountId: string;
}

/** Renders the source reconciliation YAML with `settings.run_as` set to the bound account. */
export const renderBoundSourceReconciliationYaml = ({
  serviceAccountId,
}: NightshiftBoundSourceReconciliationTemplateValues): string =>
  renderRunAs(SOURCE_RECONCILIATION_YAML, serviceAccountId);

/**
 * The space's source reconciliation, installed per space by the space's setup and bound to the
 * detection engine service account, so the changes of a source are applied as that account.
 */
export const NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yamlTemplate: renderBoundSourceReconciliationYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundSourceReconciliationTemplateValues>;
