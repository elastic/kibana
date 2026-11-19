/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildEksBearerToken } from './eks_token_helpers';

// The jest environment has no Web Crypto; fake the hash/signature primitives
// deterministically and input-sensitively so structural assertions still hold.
jest.mock('./aws_crypto_helpers', () => {
  const fakeHex = (input: string): string => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) % 0x100000000;
    }
    return hash.toString(16).padStart(8, '0').repeat(8);
  };
  return {
    sha256Hash: jest.fn(async (message: string) => fakeHex(message)),
    calculateAWSA4Signature: jest.fn(async (...args: string[]) => fakeHex(args.join('|'))),
  };
});

const PARAMS = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
  clusterName: 'my-cluster',
};

const decodeToken = (token: string): URL => {
  expect(token.startsWith('k8s-aws-v1.')).toBe(true);
  const base64url = token.slice('k8s-aws-v1.'.length);
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  return new URL(atob(base64));
};

describe('buildEksBearerToken', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-08T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('produces a presigned STS GetCallerIdentity URL for the cluster region', async () => {
    const url = decodeToken(await buildEksBearerToken(PARAMS));

    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('sts.us-east-1.amazonaws.com');
    expect(url.pathname).toBe('/');
    expect(url.searchParams.get('Action')).toBe('GetCallerIdentity');
    expect(url.searchParams.get('Version')).toBe('2011-06-15');
  });

  it('signs with SigV4 query parameters scoped to sts in the given region', async () => {
    const url = decodeToken(await buildEksBearerToken(PARAMS));

    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(url.searchParams.get('X-Amz-Credential')).toBe(
      'AKIAIOSFODNN7EXAMPLE/20260708/us-east-1/sts/aws4_request'
    );
    expect(url.searchParams.get('X-Amz-Date')).toBe('20260708T120000Z');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('binds the token to the cluster via the signed x-k8s-aws-id header', async () => {
    const url = decodeToken(await buildEksBearerToken(PARAMS));

    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('host;x-k8s-aws-id');
  });

  it('is deterministic for fixed time and inputs, and cluster-name sensitive', async () => {
    const first = await buildEksBearerToken(PARAMS);
    const second = await buildEksBearerToken(PARAMS);
    const otherCluster = await buildEksBearerToken({ ...PARAMS, clusterName: 'other-cluster' });

    expect(first).toBe(second);
    expect(decodeToken(otherCluster).searchParams.get('X-Amz-Signature')).not.toBe(
      decodeToken(first).searchParams.get('X-Amz-Signature')
    );
  });

  it('does not use base64 padding in the encoded token', async () => {
    const token = await buildEksBearerToken(PARAMS);
    expect(token).not.toContain('=');
    expect(token).not.toContain('+');
  });
});
