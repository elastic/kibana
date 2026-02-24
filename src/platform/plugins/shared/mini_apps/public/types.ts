/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';

/**
 * Minimal interface for the agent builder plugin start contract.
 * Defined locally to avoid a direct import from the x-pack agent_builder plugin.
 */
export interface AgentBuilderLike {
  setConversationFlyoutActiveConfig: (config: {
    sessionTag?: string;
    agentId?: string;
    initialMessage?: string;
    attachments?: Array<{
      id?: string;
      type: string;
      data: Record<string, unknown>;
      hidden?: boolean;
    }>;
  }) => void;
  clearConversationFlyoutActiveConfig: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MiniAppsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MiniAppsPluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupDeps {}

export interface StartDeps {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  agentBuilder?: AgentBuilderLike;
}
