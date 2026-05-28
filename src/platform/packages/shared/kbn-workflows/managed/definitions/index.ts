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
import { STREAMS_INVESTIGATION_WORKFLOW } from './streams_investigation';
import {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW,
} from './discoveries';
import {
  STREAMS_KI_CONTINUOUS_ONBOARDING_WORKFLOW,
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW,
  STREAMS_KI_ONBOARDING_WORKFLOW,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW,
} from './streams_ki';
import {
  STREAMS_MEMORY_CONSOLIDATION_WORKFLOW,
  STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW,
  STREAMS_MEMORY_GAP_DETECTION_WORKFLOW,
  STREAMS_MEMORY_SYNTHESIS_WORKFLOW,
} from './streams_memory';
import { EXAMPLE_MANAGED_WORKFLOW } from './workflows_extensions_example';

export {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
} from './discoveries';
export { EXAMPLE_MANAGED_WORKFLOW_ID } from './workflows_extensions_example';
export {
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  STREAMS_KI_ONBOARDING_WORKFLOW_ID,
  STREAMS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
} from './streams_ki';
export {
  STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  STREAMS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  STREAMS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
} from './streams_memory';
export {
  SIGEVENTS_DETECTION_WORKFLOW_ID,
  SIGEVENTS_DISCOVERY_WORKFLOW_ID,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGEVENTS_TRIAGE_WORKFLOW_ID,
} from './sig_events';
export { STREAMS_INVESTIGATION_WORKFLOW_ID } from './streams_investigation';

// Registering the AD workflow definitions in the managed-workflows registry is
// FF-off safe: definitions in this list are only INSTALLED into Elasticsearch
// when a registered owner plugin calls `installManagedWorkflow`. The discoveries
// plugin (the owner of these definitions) is itself gated by the
// `securitySolution.attackDiscoveryWorkflowsEnabled` feature flag, so with the
// FF off the discoveries plugin does not load and none of these workflows get
// installed. Adding them to the registry only makes them *discoverable* by id
// (which the discoveries plugin's integrity check exercises in tests).
export const managedWorkflowDefinitions = [
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW,
  EXAMPLE_MANAGED_WORKFLOW,
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW,
  STREAMS_KI_ONBOARDING_WORKFLOW,
  STREAMS_MEMORY_SYNTHESIS_WORKFLOW,
  STREAMS_MEMORY_CONSOLIDATION_WORKFLOW,
  STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW,
  STREAMS_MEMORY_GAP_DETECTION_WORKFLOW,
  STREAMS_KI_CONTINUOUS_ONBOARDING_WORKFLOW,
  SIGEVENTS_DETECTION_WORKFLOW,
  SIGEVENTS_DISCOVERY_WORKFLOW,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW,
  SIGEVENTS_TRIAGE_WORKFLOW,
  STREAMS_INVESTIGATION_WORKFLOW,
] as const;
