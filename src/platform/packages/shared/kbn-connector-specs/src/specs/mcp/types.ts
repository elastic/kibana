/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServerCapabilities } from '@kbn/mcp-client';
import type { z } from '@kbn/zod/v4';
import type {
  CallToolParams,
  MCPConnectorConfig,
  MCPConnectorSecrets,
  ListToolsRequestSchema,
} from '@kbn/connector-schemas/mcp';

export type { CallToolParams, MCPConnectorConfig, MCPConnectorSecrets };

export type ListToolsParams = z.infer<typeof ListToolsRequestSchema>;

export interface McpTestConnectorResponse {
  connected: boolean;
  capabilities?: ServerCapabilities;
}
