/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** 256 random bits, base64url: 43 URL-safe characters. */
export const generatePageSecret = (): string => randomBytes(32).toString('base64url');

/**
 * HMAC-SHA256(key=secret, data=`workflowId|spaceId`), as the connector ingress credential does.
 * Binding the workflow and space means a stored hash only matches the page it was made for.
 */
export const computePageSecretHash = ({
  workflowId,
  spaceId,
  secret,
}: {
  workflowId: string;
  spaceId: string;
  secret: string;
}): string => createHmac('sha256', secret).update(`${workflowId}|${spaceId}`).digest('hex');

/** Compares a presented secret with the stored hash in constant time. */
export const isPageSecretValid = ({
  workflowId,
  spaceId,
  secret,
  secretHash,
}: {
  workflowId: string;
  spaceId: string;
  secret: string;
  secretHash: string;
}): boolean => {
  const expected = Buffer.from(computePageSecretHash({ workflowId, spaceId, secret }), 'hex');
  const stored = Buffer.from(secretHash, 'hex');
  return expected.length === stored.length && timingSafeEqual(expected, stored);
};
