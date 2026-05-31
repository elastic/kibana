/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SDLC_GITHUB_SYNC_ORCHESTRATOR_WORKFLOW,
  SDLC_RELEASE_CALENDAR_SYNC_WORKFLOW,
  SDLC_SETUP_INDICES_WORKFLOW,
} from './sdlc_intel';
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
  SDLC_GITHUB_SYNC_ORCHESTRATOR_WORKFLOW_ID,
  SDLC_RELEASE_CALENDAR_SYNC_WORKFLOW_ID,
  SDLC_SETUP_INDICES_WORKFLOW_ID,
} from './sdlc_intel';

export const managedWorkflowDefinitions = [
  EXAMPLE_MANAGED_WORKFLOW,
  SDLC_SETUP_INDICES_WORKFLOW,
  SDLC_GITHUB_SYNC_ORCHESTRATOR_WORKFLOW,
  SDLC_RELEASE_CALENDAR_SYNC_WORKFLOW,
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW,
  STREAMS_KI_ONBOARDING_WORKFLOW,
] as const;
