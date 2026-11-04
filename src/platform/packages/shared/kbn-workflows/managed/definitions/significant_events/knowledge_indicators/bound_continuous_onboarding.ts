/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import CONTINUOUS_ONBOARDING_YAML from './continuous_onboarding.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../../types';
import { renderRunAs } from '../../nightshift_investigations/render_bound_yaml';

export const NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID =
  'system-sources-ki-continuous-onboarding-bound';

/** Document id of the continuous onboarding installed in a space (with `workflowIdSuffix`). */
export const getNightshiftBoundKiContinuousOnboardingWorkflowId = (spaceId: string): string =>
  `${NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}-${spaceId}`;

export interface NightshiftBoundKiContinuousOnboardingTemplateValues
  extends ManagedWorkflowTemplateValues {
  /** The service account the detection engine runs as in the space. */
  serviceAccountId: string;
}

/** Renders the continuous onboarding YAML with `settings.run_as` set to the bound account. */
export const renderBoundContinuousOnboardingYaml = ({
  serviceAccountId,
}: NightshiftBoundKiContinuousOnboardingTemplateValues): string =>
  renderRunAs(CONTINUOUS_ONBOARDING_YAML, serviceAccountId);

/**
 * The space's continuous KI onboarding, installed per space by the space's setup and bound to the
 * detection engine service account, so its scheduled runs and the onboardings they start run as
 * that account.
 */
export const NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yamlTemplate: renderBoundContinuousOnboardingYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundKiContinuousOnboardingTemplateValues>;
