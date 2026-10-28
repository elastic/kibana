/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import { API_KEY_PLACEHOLDER, MCPAuthType } from '@kbn/connector-schemas/mcp';

const getBasicAuthHeader = ({
  username,
  password,
}: {
  username: string;
  password: string;
}): Record<string, string> => {
  const header = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  return { Authorization: header };
};

/**
 * Builds HTTP headers from MCP connector config and secrets based on the authentication type.
 */
export const buildHeadersFromSecrets = (
  secrets: MCPConnectorSecrets,
  config: MCPConnectorConfig
): Record<string, string> => {
  const headers: Record<string, string> = {};

  if (!config.hasAuth) {
    return headers;
  }

  const authType = config.authType;

  switch (authType) {
    case MCPAuthType.Bearer:
      if (secrets.token) {
        headers.Authorization = `Bearer ${secrets.token}`;
      }
      break;

    case MCPAuthType.ApiKey:
      if (secrets.apiKey) {
        const headerName = config.apiKeyHeaderName ?? 'X-API-Key';
        headers[headerName] = config.apiKeyHeaderValue
          ? config.apiKeyHeaderValue.split(API_KEY_PLACEHOLDER).join(secrets.apiKey ?? '')
          : secrets.apiKey ?? '';
      }
      break;

    case MCPAuthType.Basic:
      if (secrets.user && secrets.password) {
        Object.assign(
          headers,
          getBasicAuthHeader({ username: secrets.user, password: secrets.password })
        );
      }
      break;

    default:
      break;
  }

  if (secrets.secretHeaders) {
    Object.assign(headers, secrets.secretHeaders);
  }

  return headers;
};

/** Config headers first, then auth headers. Auth and secret headers win on conflict. */
export const buildMcpAuthHeaders = async (
  config: Record<string, unknown>,
  secrets: Record<string, unknown>
): Promise<Record<string, string>> => {
  const typedConfig = config as MCPConnectorConfig;
  const typedSecrets = secrets as MCPConnectorSecrets;
  return {
    ...(typedConfig.headers ?? {}),
    ...buildHeadersFromSecrets(typedSecrets, typedConfig),
  };
};
