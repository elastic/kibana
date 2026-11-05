/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** A page reference: the workflow, its space, and the page trigger `id`. */
export interface WorkflowPageRef {
  workflowId: string;
  spaceId: string;
  pageId: string;
}

/** Makes a new secret: 256 random bits as 43 base64url characters. */
export const generatePageSecret = (): string => randomBytes(32).toString('base64url');

/**
 * Makes the hash that the public route compares against.
 * The HMAC binds the secret to one page, so a stored hash never matches another page.
 */
export const computePageSecretHash = (ref: WorkflowPageRef, secret: string): string =>
  createHmac('sha256', secret)
    .update(`${ref.spaceId}|${ref.workflowId}|${ref.pageId}`)
    .digest('hex');

/** Compares a presented secret with the stored hash in constant time. */
export const isPageSecretValid = (
  ref: WorkflowPageRef,
  secret: string,
  secretHash: string
): boolean => {
  const expected = Buffer.from(computePageSecretHash(ref, secret), 'hex');
  const stored = Buffer.from(secretHash, 'hex');
  return expected.length === stored.length && timingSafeEqual(expected, stored);
};
