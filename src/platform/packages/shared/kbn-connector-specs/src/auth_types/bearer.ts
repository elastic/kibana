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
 * Bearer Token Authentication
 * Use for: OAuth tokens, API tokens sent as "Authorization: Bearer <token>"
 */
export const BearerAuth: AuthTypeSpec = {
  id: 'bearer',
  name: 'Bearer Token Authentication',
  schema: z.object({
    // these should default to being registered as a secret field so we don't explicitly define it here
    token: z.string().describe('Bearer Token'),
  }),
};

// export const BearerAuthSchema = z.object({
//   method: z.literal('bearer'),
//   token: withUIMeta(z.string(), { sensitive: true }).describe('Bearer Token'),
// });
