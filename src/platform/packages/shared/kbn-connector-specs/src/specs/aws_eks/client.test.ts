/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { accessEntryPath, awsCredentials, request, resolveRegion } from './client';

const ctx = (config: Record<string, unknown>, secrets: Record<string, unknown> = {}) =>
  ({ config, secrets }) as unknown as ActionContext;

describe('client', () => {
  it('prefers the per-call Region and trims it', () => {
    expect(resolveRegion(ctx({ region: 'us-east-1' }), ' eu-west-1 ')).toBe('eu-west-1');
    expect(resolveRegion(ctx({ region: 'us-east-1' }), '  ')).toBe('us-east-1');
    expect(() => resolveRegion(ctx({}))).toThrow('No AWS Region available');
  });

  it('encodes the principal ARN as one path segment', () => {
    expect(accessEntryPath('us-east-1', 'c', 'arn:aws:iam::1:role/path/r')).toBe(
      'https://eks.us-east-1.amazonaws.com/clusters/c/access-entries/arn%3Aaws%3Aiam%3A%3A1%3Arole%2Fpath%2Fr'
    );
  });

  it('maps EKS errors from a string body and keeps the type out when none is sent', async () => {
    await expect(
      request(() => Promise.reject({ response: { status: 500, data: 'upstream failure' } }))
    ).rejects.toThrow('Amazon EKS API error (500): upstream failure');
  });

  it('requires both halves of the access key', () => {
    expect(() => awsCredentials(ctx({}, { accessKeyId: 'AKIA' }))).toThrow(
      'no AWS access key configured'
    );
    expect(awsCredentials(ctx({}, { accessKeyId: 'AKIA', secretAccessKey: 's' }))).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 's',
    });
  });
});
