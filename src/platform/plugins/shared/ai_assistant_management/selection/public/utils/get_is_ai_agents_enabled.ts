/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { AI_AGENTS_FEATURE_FLAG, AI_AGENTS_FEATURE_FLAG_DEFAULT } from '@kbn/ai-assistant-common';

/**
 * Checks if the AI Agents feature is enabled via feature flag.
 * @param coreStart - Core start services
 * @returns Promise resolving to boolean indicating if AI Agents are enabled
 */
export async function getIsAiAgentsEnabled(coreStart: CoreStart): Promise<boolean> {
  const isFeatureFlagEnabled = await coreStart.featureFlags.getBooleanValue(
    AI_AGENTS_FEATURE_FLAG,
    AI_AGENTS_FEATURE_FLAG_DEFAULT
  );
  return isFeatureFlagEnabled;
}
