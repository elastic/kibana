/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-nodejs-modules -- This helper is exported from @kbn/workflows/server and used only by server-side Workflows code; HMAC signing relies on Node crypto.
import { createHmac } from 'node:crypto';

/**
 * Computes HMAC-SHA-256(key=token, data=executionId|stepExecutionId|expiresAt).
 * Binding these fields into the signature prevents index-level tampering
 * (e.g. extending TTL or moving the token to another step execution).
 */
export const computeTokenHmac = (
  token: string,
  executionId: string,
  stepExecutionId: string,
  expiresAt: string
): string =>
  createHmac('sha256', token)
    .update(`${executionId}|${stepExecutionId}|${expiresAt}`)
    .digest('hex');
