/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-nodejs-modules -- server-only HMAC signing for external resume links */

import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

export const EXTERNAL_RESUME_TOKEN_VERSION = 2 as const;

export interface ExternalResumeTokenPayload {
  v: typeof EXTERNAL_RESUME_TOKEN_VERSION;
  jti: string;
  apiKeyId: string;
  exp: number;
  spaceId: string;
  executionId: string;
  stepId: string;
}

export class ExternalResumeTokenVerificationError extends Error {
  constructor(message: string, public readonly statusCode = 401) {
    super(message);
    this.name = 'ExternalResumeTokenVerificationError';
  }
}

export function createExternalResumeTokenPayload({
  spaceId,
  executionId,
  stepId,
  apiKeyId,
  ttlMs,
  jti,
}: {
  spaceId: string;
  executionId: string;
  stepId: string;
  apiKeyId: string;
  ttlMs: number;
  jti?: string;
}): ExternalResumeTokenPayload {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));

  return {
    v: EXTERNAL_RESUME_TOKEN_VERSION,
    jti: jti ?? randomUUID(),
    apiKeyId,
    exp: nowSeconds + ttlSeconds,
    spaceId,
    executionId,
    stepId,
  };
}

function canonicalPayloadB64(payload: ExternalResumeTokenPayload): string {
  const ordered: ExternalResumeTokenPayload = {
    v: payload.v,
    jti: payload.jti,
    apiKeyId: payload.apiKeyId,
    exp: payload.exp,
    spaceId: payload.spaceId,
    executionId: payload.executionId,
    stepId: payload.stepId,
  };

  return Buffer.from(JSON.stringify(ordered), 'utf8').toString('base64url');
}

export function signExternalResumeToken(
  payload: ExternalResumeTokenPayload,
  signingKey: string
): string {
  if (!signingKey) {
    throw new Error('External resume signing key must be configured');
  }

  const payloadB64 = canonicalPayloadB64(payload);
  const signature = createHmac('sha256', signingKey).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

function assertTokenPayload(value: unknown): ExternalResumeTokenPayload {
  if (value == null || typeof value !== 'object') {
    throw new ExternalResumeTokenVerificationError('Invalid resume token');
  }

  const payload = value as Partial<ExternalResumeTokenPayload>;
  if (
    payload.v !== EXTERNAL_RESUME_TOKEN_VERSION ||
    typeof payload.jti !== 'string' ||
    payload.jti.length === 0 ||
    typeof payload.apiKeyId !== 'string' ||
    payload.apiKeyId.length === 0 ||
    typeof payload.exp !== 'number' ||
    typeof payload.spaceId !== 'string' ||
    payload.spaceId.length === 0 ||
    typeof payload.executionId !== 'string' ||
    payload.executionId.length === 0 ||
    typeof payload.stepId !== 'string' ||
    payload.stepId.length === 0
  ) {
    throw new ExternalResumeTokenVerificationError('Invalid resume token');
  }

  return payload as ExternalResumeTokenPayload;
}

export function verifyExternalResumeToken(
  token: string,
  signingKey: string
): ExternalResumeTokenPayload {
  if (!signingKey) {
    throw new ExternalResumeTokenVerificationError('External resume is not configured', 503);
  }

  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
    throw new ExternalResumeTokenVerificationError('Invalid resume token');
  }

  const payloadB64 = token.slice(0, separatorIndex);
  const signatureB64 = token.slice(separatorIndex + 1);
  const expectedSignature = createHmac('sha256', signingKey).update(payloadB64).digest('base64url');

  const providedSignature = Buffer.from(signatureB64, 'base64url');
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'base64url');
  if (
    providedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(providedSignature, expectedSignatureBuffer)
  ) {
    throw new ExternalResumeTokenVerificationError('Invalid resume token');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new ExternalResumeTokenVerificationError('Invalid resume token');
  }

  const payload = assertTokenPayload(parsed);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSeconds) {
    throw new ExternalResumeTokenVerificationError('Resume link has expired', 410);
  }

  return payload;
}
