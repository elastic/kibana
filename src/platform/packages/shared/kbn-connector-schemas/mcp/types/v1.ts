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
  ConfigSchema,
  SecretsSchema,
  MCPConnectorConfigSchema,
  MCPConnectorSecretsSchema,
} from '../schemas/v1';

// Legacy types (for backward compatibility during migration)
export type Config = z.input<typeof ConfigSchema>;
export type Secrets = z.infer<typeof SecretsSchema>;

// New types (for multi-auth support)
export type MCPConnectorConfig = z.input<typeof MCPConnectorConfigSchema>;
export type MCPConnectorSecrets = z.infer<typeof MCPConnectorSecretsSchema>;
