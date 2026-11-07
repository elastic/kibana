/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';

/** Agent Builder, when the user can open a chat: capability, license and an LLM connector. */
export const resolveAgentBuilder = async (
  core: CoreStart,
  agentBuilder?: AgentBuilderPluginStart
): Promise<AgentBuilderPluginStart | undefined> => {
  if (!agentBuilder || core.application.capabilities.agentBuilder?.show !== true) {
    return undefined;
  }
  const { hasRequiredLicense, hasLlmConnector } = await agentBuilder.getAgentBuilderAccess();
  return hasRequiredLicense && hasLlmConnector ? agentBuilder : undefined;
};
