/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/** Stored HMAC-SHA256 hex digest of the ingest token. Never the raw token. */
export const ingestTokenHashSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .optional()
  .describe('HMAC-SHA256 hex digest of the ingest token. Set on create; never the raw token.')
  .meta({ hidden: true });
