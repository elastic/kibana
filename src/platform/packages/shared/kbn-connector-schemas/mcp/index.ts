/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export * from './constants';

// Export old simple schemas (for backward compatibility)
export { ConfigSchema, SecretsSchema } from './schemas/latest';
export type { Config, Secrets } from './types/latest';

// Export new comprehensive schemas (for multi-auth support)
export {
  MCPConnectorConfigSchema,
  MCPConnectorSecretsSchema,
  MCPConnectorHTTPServiceConfigSchema,
  MCPConnectorSecretsNoneSchema,
  MCPConnectorSecretsBearerSchema,
  MCPConnectorSecretsApiKeySchema,
  MCPConnectorSecretsBasicSchema,
  MCPConnectorSecretsCustomHeadersSchema,
} from './schemas/latest';
export type { MCPConnectorConfig, MCPConnectorSecrets } from './types/latest';
