/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { ApiKey } from '@kbn/security-plugin-types-common';
import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import { defineRoute } from './types';

export interface AgentKeysResponse {
  agentKeys: ApiKey[];
}

export interface AgentKeysPrivilegesResponse {
  areApiKeysEnabled: boolean;
  isAdmin: boolean;
  canManage: boolean;
}

export interface InvalidateAgentKeyResponse {
  invalidatedAgentKeys: string[];
}

export interface CreateAgentKeyResponse {
  agentKey: SecurityCreateApiKeyResponse;
}

export const agentKeysRoute = defineRoute<AgentKeysResponse>()({
  endpoint: 'GET /internal/apm/agent_keys' as const,
});

export const agentKeysPrivilegesRoute = defineRoute<AgentKeysPrivilegesResponse>()({
  endpoint: 'GET /internal/apm/agent_keys/privileges' as const,
});

export const invalidateAgentKeyRoute = defineRoute<InvalidateAgentKeyResponse>()({
  endpoint: 'POST /internal/apm/api_key/invalidate' as const,
  params: t.type({
    body: t.type({ id: t.string }),
  }),
});

export const createAgentKeyRoute = defineRoute<CreateAgentKeyResponse>()({
  endpoint: 'POST /api/apm/agent_keys 2023-10-31' as const,
  params: t.type({
    body: t.type({
      name: t.string,
      privileges: t.array(
        t.union([t.literal('event:write'), t.literal('config_agent:read')])
      ),
    }),
  }),
});
