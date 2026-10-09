/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ONBOARDING_SUGGESTIONS_WORKFLOW_YAML from './onboarding_suggestions_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID =
  'system-nightshift-onboarding-suggestions';

/**
 * Explores the deployments connected during Nightshift onboarding and suggests first
 * investigations. Its executions are the onboarding state: inputs name the connectors, the
 * `workflow.output` carries the suggestions.
 */
export const NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW = {
  id: NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 8,
  billable: false,
  yaml: ONBOARDING_SUGGESTIONS_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
