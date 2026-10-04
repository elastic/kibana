/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-nodejs-modules -- Server-only helper; HMAC signing relies on Node crypto.
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Length of the hex-encoded HMAC-SHA-256 secret in a page URL. */
export const PAGE_SECRET_LENGTH = 64;

/**
 * Derives the secret part of a page URL from the deployment signing key.
 *
 * Nothing secret is stored and nothing page-related lives in the workflow YAML.
 * The secret binds the space, the workflow id, and `pageGeneration`, a counter on
 * the workflow document. Rotating the page increments the counter, which retires
 * the old URL. Binding the space stops a URL from being replayed in another space.
 */
export const computePageSecret = (
  signingKey: string,
  { spaceId, workflowId, generation }: PageSecretInput
): string =>
  createHmac('sha256', signingKey)
    .update(`workflow-page|${spaceId}|${workflowId}|${generation}`)
    .digest('hex');

export interface PageSecretInput {
  spaceId: string;
  workflowId: string;
  generation: number;
}

/** Constant-time check so a wrong secret leaks no timing signal. */
export const verifyPageSecret = (
  signingKey: string,
  input: PageSecretInput,
  candidate: string
): boolean => {
  const expected = Buffer.from(computePageSecret(signingKey, input), 'utf8');
  const provided = Buffer.from(candidate, 'utf8');
  return expected.length === provided.length && timingSafeEqual(expected, provided);
};
