/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type {
  MCPConnectorConfigSchema,
  MCPConnectorSecretsSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TestConnectorRequestSchema,
} from '../schemas/v1';

// Connector config and secrets types
export type MCPConnectorConfig = z.input<typeof MCPConnectorConfigSchema>;
export type MCPConnectorSecrets = z.infer<typeof MCPConnectorSecretsSchema>;

// Type aliases for consistency with other connectors
export type Config = MCPConnectorConfig;
export type Secrets = MCPConnectorSecrets;

// Sub-action parameter types
export type CallToolParams = z.infer<typeof CallToolRequestSchema>;
export type ListToolsParams = z.infer<typeof ListToolsRequestSchema>;
export type TestConnectorParams = z.infer<typeof TestConnectorRequestSchema>;
