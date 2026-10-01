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
 * Nothing secret is stored: the `page-id` in the workflow YAML identifies the page
 * but does not open it, so YAML, exports, and change history never contain a
 * credential. Rotating a page assigns a new `page-id`, which changes the secret.
 * The space is bound in so a page URL cannot be replayed in another space.
 */
export const computePageSecret = (signingKey: string, spaceId: string, pageId: string): string =>
  createHmac('sha256', signingKey).update(`workflow-page|${spaceId}|${pageId}`).digest('hex');

/** Constant-time check so a wrong secret leaks no timing signal. */
export const verifyPageSecret = (
  signingKey: string,
  spaceId: string,
  pageId: string,
  candidate: string
): boolean => {
  const expected = Buffer.from(computePageSecret(signingKey, spaceId, pageId), 'utf8');
  const provided = Buffer.from(candidate, 'utf8');
  return expected.length === provided.length && timingSafeEqual(expected, provided);
};
