/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodObject } from '@kbn/zod';

/**
 * Minimal interface for the agent builder plugin setup contract (server-side).
 * Defined locally to avoid a direct import from the x-pack agent_builder plugin.
 */
export interface AgentBuilderServerLike {
  tools: {
    register: (tool: {
      id: string;
      type: 'builtin';
      description: string;
      schema: ZodObject<any>;
      handler: (params: any, context: any) => any;
      tags: string[];
    }) => void;
  };
  attachments: {
    registerType: (type: {
      id: string;
      validate: (input: unknown) => { valid: true; data: unknown } | { valid: false; error: string };
      format: (attachment: { data: any }) => {
        getRepresentation: () => { type: string; value: string };
      };
      isReadonly?: boolean;
      getTools?: () => string[];
    }) => void;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MiniAppsServerPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MiniAppsServerPluginStart {}

export interface SetupDeps {
  agentBuilder?: AgentBuilderServerLike;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartDeps {}
