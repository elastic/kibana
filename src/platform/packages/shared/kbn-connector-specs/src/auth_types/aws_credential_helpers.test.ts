/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseAwsHost, signRequest } from './aws_credential_helpers';
import { calculateAWSA4Signature, sha256Hash } from './aws_crypto_helpers';

jest.mock('./aws_crypto_helpers', () => ({
  sha256Hash: jest.fn(),
  hmacSha256: jest.fn(),
  calculateAWSA4Signature: jest.fn(),
}));

const mockSha256Hash = jest.mocked(sha256Hash);
const mockCalculateAWSA4Signature = jest.mocked(calculateAWSA4Signature);

describe('parseAwsHost()', () => {
  it('returns null for non-AWS hostnames', () => {
    expect(parseAwsHost('example.com')).toBeNull();
  });

  it('returns null when service/region are missing', () => {
    expect(parseAwsHost('amazonaws.com')).toBeNull();
    expect(parseAwsHost('s3.amazonaws.com')).toBeNull();
  });

  it('parses service and region from standard AWS hostname', () => {
    expect(parseAwsHost('lambda.us-east-1.amazonaws.com')).toEqual({
      service: 'lambda',
      region: 'us-east-1',
    });
  });

  it('parses item-specific AWS hostname', () => {
    expect(parseAwsHost('my-bucket.s3.us-west-2.amazonaws.com')).toEqual({
      itemName: 'my-bucket',
      service: 's3',
      region: 'us-west-2',
    });
  });
});

describe('signRequest()', () => {
  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T12:34:56.000Z'));
    mockSha256Hash.mockResolvedValue('b'.repeat(64));
    mockCalculateAWSA4Signature.mockResolvedValue('a'.repeat(64));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('returns signed headers for lambda requests', async () => {
    const result = await signRequest(
      'GET',
      'lambda.us-east-1.amazonaws.com',
      '/2015-03-31/functions',
      { FunctionName: 'my-function' },
      'AKIA_TEST',
      'SECRET_TEST',
      'us-east-1',
      'lambda',
      { 'x-amz-security-token': 'session-token' }
    );

    expect(result.Host).toBe('lambda.us-east-1.amazonaws.com');
    expect(result['X-Amz-Date']).toBe('20260311T123456Z');
    expect(result.Authorization).toContain(
      'Credential=AKIA_TEST/20260311/us-east-1/lambda/aws4_request'
    );
    expect(result.Authorization).toContain('SignedHeaders=host;x-amz-date;x-amz-security-token');
    expect(result.Authorization).toMatch(/Signature=[a-f0-9]+/);
    expect(result['x-amz-content-sha256']).toBeUndefined();
  });

  it('returns signed headers for s3 requests including x-amz-content-sha256', async () => {
    const body = JSON.stringify({ prefix: 'logs/' });
    const result = await signRequest(
      'POST',
      'my-bucket.s3.us-west-2.amazonaws.com',
      '/?list-type=2',
      {},
      'AKIA_TEST',
      'SECRET_TEST',
      'us-west-2',
      's3',
      {},
      body
    );

    expect(result.Host).toBe('my-bucket.s3.us-west-2.amazonaws.com');
    expect(result['X-Amz-Date']).toBe('20260311T123456Z');
    expect(result.Authorization).toContain(
      'Credential=AKIA_TEST/20260311/us-west-2/s3/aws4_request'
    );
    expect(result.Authorization).toContain('SignedHeaders=content-type;host;x-amz-date');
    expect(result.Authorization).toMatch(/Signature=[a-f0-9]+/);
    expect(result['Content-Type']).toBe('application/json');
    expect(result['x-amz-content-sha256']).toMatch(/^[a-f0-9]{64}$/);
  });
});
