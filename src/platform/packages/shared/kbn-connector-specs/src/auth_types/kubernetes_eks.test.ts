/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { AxiosInstance } from 'axios';
import type { AuthContext } from '../connector_spec';
import { KubernetesEksAuth } from './kubernetes_eks_server';

// The jest environment has no Web Crypto; fake the hash/signature primitives.
vi.mock('./aws_crypto_helpers', () => {
      const mocked = {
      sha256Hash: vi.fn(async () => 'aa'.repeat(32)),
      calculateAWSA4Signature: vi.fn(async () => 'bb'.repeat(32)),
    };
      return { ...mocked, default: mocked };
    });

const SECRET = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'eu-west-1',
  clusterName: 'prod-cluster',
};

const createMockAxiosInstance = () =>
  ({
    defaults: { headers: { common: {} } },
    interceptors: { request: { clear: vi.fn(), use: vi.fn() } },
  } as unknown as AxiosInstance);

const mockContext = {
  getCustomHostSettings: vi.fn(),
  logger: { debug: vi.fn(), warn: vi.fn() },
  sslSettings: {},
} as unknown as AuthContext;

describe('KubernetesEksAuth', () => {
  it('has the expected id and schema fields', () => {
    expect(KubernetesEksAuth.id).toBe('kubernetes_eks');
    const shape = KubernetesEksAuth.schema.shape;
    expect(shape).toHaveProperty('accessKeyId');
    expect(shape).toHaveProperty('secretAccessKey');
    expect(shape).toHaveProperty('region');
    expect(shape).toHaveProperty('clusterName');
    expect(shape).toHaveProperty('caCert');
    expect(shape).toHaveProperty('verificationMode');
  });

  it('sets a freshly minted EKS bearer token on the axios instance', async () => {
    const axiosInstance = createMockAxiosInstance();

    await KubernetesEksAuth.configure(mockContext, axiosInstance, SECRET);

    const authorization = axiosInstance.defaults.headers.common.Authorization as string;
    expect(authorization).toMatch(/^Bearer k8s-aws-v1\./);

    const base64url = authorization.slice('Bearer k8s-aws-v1.'.length);
    const url = new URL(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')));
    expect(url.host).toBe('sts.eu-west-1.amazonaws.com');
    expect(url.searchParams.get('Action')).toBe('GetCallerIdentity');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('host;x-k8s-aws-id');
  });

  it('configures TLS with the pasted cluster CA', async () => {
    const axiosInstance = createMockAxiosInstance();

    await KubernetesEksAuth.configure(mockContext, axiosInstance, {
      ...SECRET,
      caCert: '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----',
      verificationMode: 'certificate',
    });

    expect(axiosInstance.interceptors.request.clear).toHaveBeenCalled();
    expect(axiosInstance.interceptors.request.use).toHaveBeenCalled();
  });
});
