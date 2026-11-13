/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../types';
import { readManagedWorkflowYaml } from '../read_managed_workflow_yaml';

export const FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID = 'system-fleet-aws-agentless-onboarding';

// Installed once in the global space by Fleet, and only while the agentic AWS onboarding
// feature flag is on. Registry membership alone installs nothing.
export const FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW = {
  id: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
  pluginId: 'fleet',
  version: 1,
  billable: false,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'aws_agentless_onboarding.yaml');
  },
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
