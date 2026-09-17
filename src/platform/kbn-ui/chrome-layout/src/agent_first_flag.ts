/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AGENT_FIRST_FEATURE_FLAG_KEY } from './constants';

interface FeatureFlagsBooleanReader {
  getBooleanValue: (flagName: string, defaultValue: boolean) => boolean;
}

/**
 * POC: agent-first chrome layout with a dedicated agent workspace column.
 * Enable via `feature_flags.overrides.core.chrome.agentFirst: true` in kibana.dev.yml.
 */
export const isAgentFirst = (featureFlags: FeatureFlagsBooleanReader): boolean =>
  featureFlags.getBooleanValue(AGENT_FIRST_FEATURE_FLAG_KEY, false);
