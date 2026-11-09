/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import PUBLISH_OUTCOME_YAML from './publish_outcome.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const CASES_MANAGED_WORKFLOW_PLUGIN_ID = 'cases';

export const CASES_PUBLISH_OUTCOME_WORKFLOW_ID = 'system-cases-publish-outcome';

/**
 * Global, shipped enabled. Publishes a closed case's outcome to the context engine and retracts
 * it when the case reopens. Restorable so an operator who turns it off keeps it off on upgrade.
 */
export const CASES_PUBLISH_OUTCOME_WORKFLOW = {
  billable: false,
  id: CASES_PUBLISH_OUTCOME_WORKFLOW_ID,
  management: { enablement: 'restorable', lifecycle: 'static', versionStrategy: 'auto' },
  pluginId: CASES_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: PUBLISH_OUTCOME_YAML,
} as const satisfies ManagedWorkflowDefinition;
