/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import BOUND_ONBOARDING_WORKFLOW_YAML from './bound_onboarding.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../../types';
import { renderRunAs } from '../../nightshift_investigations/render_bound_yaml';

export const NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID = 'system-sources-ki-onboarding-bound';

/**
 * `triggeredBy` of every run of the entry point that the detection engine starts. The entry point
 * fails any other run, so KI onboarding as the service account goes through Significant Events
 * and its checks rather than the generic workflow run API. Only server code sets `triggeredBy`.
 */
export const NIGHTSHIFT_SOURCE_KI_EXTRACTION_TRIGGER_SOURCE = 'nightshift-source-ki-extraction';

/** Document id of the entry point installed in a space (installed with `workflowIdSuffix`). */
export const getNightshiftBoundKiOnboardingWorkflowId = (spaceId: string): string =>
  `${NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID}-${spaceId}`;

export interface NightshiftBoundKiOnboardingTemplateValues extends ManagedWorkflowTemplateValues {
  /** The service account KI onboarding runs as in the space. */
  serviceAccountId: string;
}

/** Renders the space entry point with `settings.run_as` set to the bound service account. */
export const renderBoundOnboardingYaml = ({
  serviceAccountId,
}: NightshiftBoundKiOnboardingTemplateValues): string =>
  renderRunAs(BOUND_ONBOARDING_WORKFLOW_YAML, serviceAccountId);

/**
 * The space's entry point to KI onboarding, installed per space and bound to the detection engine
 * service account. It calls the shared onboarding workflow, which inherits its identity and hands
 * it to the workflows it starts. A space without this entry point cannot run KI extraction.
 */
export const NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yamlTemplate: renderBoundOnboardingYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundKiOnboardingTemplateValues>;
