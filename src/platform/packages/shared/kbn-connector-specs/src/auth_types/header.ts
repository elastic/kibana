/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { AuthTypeSpec } from '../connector_spec';

/**
 * Header-based authentication (generic)
 * Use for: API keys, custom headers (X-API-Key, etc.)
 */
export const HeaderAuth: AuthTypeSpec = {
  id: 'header',
  name: 'Header Based Authentication',
  schema: z.object({
    // these should default to being registered as a secret field so we don't explicitly define it here
    headers: z.record(z.string(), z.string()).describe('Custom Headers'),
  }),
};

// export const HeaderAuthSchema = z.object({
//   method: z.literal('headers'),
//   headers: z.record(z.string(), z.string()).describe('Custom Headers'),
// });
