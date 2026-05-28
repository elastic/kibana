/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SIGEVENTS_DETECTION_WORKFLOW,
  SIGEVENTS_DISCOVERY_WORKFLOW,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW,
  SIGEVENTS_TRIAGE_WORKFLOW,
} from './sig_events';
import {
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW,
  STREAMS_KI_ONBOARDING_WORKFLOW,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW,
} from './streams_ki';
import { EXAMPLE_MANAGED_WORKFLOW } from './workflows_extensions_example';

export { EXAMPLE_MANAGED_WORKFLOW_ID } from './workflows_extensions_example';
export {
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  STREAMS_KI_ONBOARDING_WORKFLOW_ID,
} from './streams_ki';
export {
  SIGEVENTS_DETECTION_WORKFLOW_ID,
  SIGEVENTS_DISCOVERY_WORKFLOW_ID,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGEVENTS_TRIAGE_WORKFLOW_ID,
} from './sig_events';

export const managedWorkflowDefinitions = [
  EXAMPLE_MANAGED_WORKFLOW,
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW,
  STREAMS_KI_ONBOARDING_WORKFLOW,
  SIGEVENTS_DETECTION_WORKFLOW,
  SIGEVENTS_DISCOVERY_WORKFLOW,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW,
  SIGEVENTS_TRIAGE_WORKFLOW,
] as const;
