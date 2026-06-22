/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createExternalResumeTokenPayload,
  ExternalResumeTokenVerificationError,
  signExternalResumeToken,
  verifyExternalResumeToken,
} from './external_resume_token';
import { buildExternalResumeUrl } from '../../../common/external_resume/build_external_resume_url';

const SIGNING_KEY = 'test-signing-key-with-at-least-32-characters';

describe('external resume token', () => {
  const basePayload = createExternalResumeTokenPayload({
    spaceId: 'default',
    executionId: 'exec-1',
    stepId: 'request-approval',
    ttlMs: 60_000,
    jti: 'token-jti',
  });

  it('signs and verifies a token payload', () => {
    const token = signExternalResumeToken(basePayload, SIGNING_KEY);
    expect(verifyExternalResumeToken(token, SIGNING_KEY)).toEqual(basePayload);
  });

  it('rejects tampered tokens', () => {
    const token = signExternalResumeToken(basePayload, SIGNING_KEY);
    const separatorIndex = token.lastIndexOf('.');
    const tampered = `${token.slice(0, separatorIndex - 1)}x${token.slice(separatorIndex)}`;

    expect(() => verifyExternalResumeToken(tampered, SIGNING_KEY)).toThrow(
      ExternalResumeTokenVerificationError
    );
  });

  it('rejects expired tokens', () => {
    const expiredPayload = {
      ...basePayload,
      exp: Math.floor(Date.now() / 1000) - 10,
    };
    const token = signExternalResumeToken(expiredPayload, SIGNING_KEY);

    expect(() => verifyExternalResumeToken(token, SIGNING_KEY)).toThrow(
      new ExternalResumeTokenVerificationError('Resume link has expired', 410)
    );
  });

  it('builds a resume URL with the token query parameter', () => {
    const token = signExternalResumeToken(basePayload, SIGNING_KEY);
    const url = buildExternalResumeUrl({
      kibanaUrl: 'https://kibana.example',
      spaceId: 'default',
      executionId: 'exec-1',
      token,
    });

    expect(url).toBe(
      `https://kibana.example/api/workflows/executions/exec-1/resume/external?token=${encodeURIComponent(
        token
      )}`
    );
  });
});
