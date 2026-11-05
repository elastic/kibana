/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import CONTINUOUS_ONBOARDING_YAML from './bound_continuous_onboarding.yaml';
import { defineBoundWorkflow } from '../../../define_bound_workflow';

export const NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID =
  'system-sources-ki-continuous-onboarding-bound';

/**
 * The space's continuous KI onboarding, installed per space when the setting is turned on and
 * bound to the detection engine service account, so the onboarding runs it starts run as that
 * account.
 */
export const NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW = defineBoundWorkflow({
  id: NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  pluginId: 'significantEvents',
  yaml: CONTINUOUS_ONBOARDING_YAML,
  version: 1,
});
