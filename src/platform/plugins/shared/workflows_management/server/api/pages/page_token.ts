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

/**
 * POC-only page token: a deterministic HMAC over the space and workflow id,
 * signed with a single deployment-wide key.
 *
 * This is deliberately throwaway. It has no per-page secret, no expiry, and no
 * rotation — rotating the deployment key invalidates every page at once. The
 * real feature needs a per-page secret stored on a saved object so a single
 * page can be rotated or revoked on its own.
 */
export const computePageToken = (signingKey: string, spaceId: string, workflowId: string): string =>
  createHmac('sha256', signingKey).update(`page|${spaceId}|${workflowId}`).digest('hex');

/** Constant-time comparison so a wrong token leaks no timing signal. */
export const verifyPageToken = (
  signingKey: string,
  spaceId: string,
  workflowId: string,
  candidate: string
): boolean => {
  const expected = Buffer.from(computePageToken(signingKey, spaceId, workflowId), 'utf8');
  const provided = Buffer.from(candidate, 'utf8');
  if (expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(expected, provided);
};
