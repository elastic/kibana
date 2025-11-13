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
 * HTTP Basic Authentication
 * Use for: Username + Password auth (Jira, etc.)
 */
export const BasicAuth: AuthTypeSpec = {
  id: 'basic',
  name: 'HTTP Basic Authentication',
  // these should default to being registered as a secret field so we don't explicitly define it here
  schema: z.object({
    username: z.string().describe('Username'),
    password: z.string().describe('Password'),
  }),
};

// export const BasicAuthSchema = z.object({
//   method: z.literal('basic'),
//   credentials: z.object({
//     username: z.string().describe('Username'),
//     password: withUIMeta(z.string(), { sensitive: true }).describe('Password'),
//   }),
// });
