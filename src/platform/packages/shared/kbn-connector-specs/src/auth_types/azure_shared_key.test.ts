/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import type { AuthContext } from '../connector_spec';
import {
  buildCanonicalizedHeaders,
  buildCanonicalizedResource,
  buildStringToSign,
  AzureSharedKeyAuth,
} from './azure_shared_key';
import { computeSignature } from './azure_shared_key_crypto';

jest.mock('./azure_shared_key_crypto', () => ({
  computeSignature: jest.fn().mockResolvedValue('mock-signature'),
}));

const mockComputeSignature = jest.mocked(computeSignature);

describe('Azure Shared Key auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockComputeSignature.mockResolvedValue('mock-signature');
  });

  describe('AzureSharedKeyAuth', () => {
    it('has id azure_shared_key and schema with accountName and accountKey', () => {
      expect(AzureSharedKeyAuth.id).toBe('azure_shared_key');
      expect(AzureSharedKeyAuth.schema.shape.accountName).toBeDefined();
      expect(AzureSharedKeyAuth.schema.shape.accountKey).toBeDefined();
    });

    it('sets x-ms-date and Authorization headers on each request', async () => {
      const accountName = 'myaccount';
      const accountKey = 'dGVzdGtleQ==';

      const axiosInstance = axios.create();
      axiosInstance.defaults.headers.common['x-ms-version'] = '2021-06-08';

      let capturedXMsDate: string | undefined;
      let capturedAuthorization: string | undefined;

      // Capture interceptor added FIRST so it runs LAST (after signing, due to LIFO order)
      axiosInstance.interceptors.request.use((config) => {
        capturedXMsDate = config.headers['x-ms-date'] as string;
        capturedAuthorization = config.headers.Authorization as string;
        const testErr = Object.assign(new Error('test_stop'), { isTestStop: true });
        return Promise.reject(testErr);
      });

      const mockCtx = {
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        getCustomHostSettings: () => undefined,
        getToken: async () => null,
        proxySettings: undefined,
        sslSettings: { verificationMode: 'full' as const },
      } as unknown as AuthContext;

      // Signing interceptor added LAST so it runs FIRST (LIFO)
      await AzureSharedKeyAuth.configure(mockCtx, axiosInstance, { accountName, accountKey });

      await axiosInstance
        .get('https://myaccount.blob.core.windows.net/mycontainer/blob.txt')
        .catch((e: Error & { isTestStop?: boolean }) => {
          if (!e.isTestStop) throw e;
        });

      expect(capturedXMsDate).toBeDefined();
      expect(capturedAuthorization).toBe('SharedKey myaccount:mock-signature');
    });

    it('passes the correct string-to-sign to computeSignature', async () => {
      const accountName = 'myaccount';
      const accountKey = 'dGVzdGtleQ==';

      const axiosInstance = axios.create();
      axiosInstance.defaults.headers.common['x-ms-version'] = '2021-06-08';

      const mockCtx = {
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        getCustomHostSettings: () => undefined,
        getToken: async () => null,
        proxySettings: undefined,
        sslSettings: { verificationMode: 'full' as const },
      } as unknown as AuthContext;

      // Short-circuit the request before it hits the network (LIFO: runs after the signing interceptor)
      axiosInstance.interceptors.request.use(() => {
        const testErr = Object.assign(new Error('test_stop'), { isTestStop: true });
        return Promise.reject(testErr);
      });

      await AzureSharedKeyAuth.configure(mockCtx, axiosInstance, { accountName, accountKey });

      await axiosInstance
        .get('https://myaccount.blob.core.windows.net/mycontainer/blob%20with%20spaces.txt')
        .catch((e: Error & { isTestStop?: boolean }) => {
          if (!e.isTestStop) throw e;
        });

      expect(mockComputeSignature).toHaveBeenCalledTimes(1);
      const [stringToSign, keyArg] = mockComputeSignature.mock.calls[0];
      expect(keyArg).toBe(accountKey);
      // Canonical resource must use the encoded URI path (spaces stay as %20)
      expect(stringToSign).toContain('/myaccount/mycontainer/blob%20with%20spaces.txt');
      // String-to-sign must start with the verb
      expect(stringToSign).toMatch(/^GET\n/);
    });
  });

  describe('getRequestUrl (via interceptor)', () => {
    it('throws if query params are embedded in the URL string', async () => {
      const axiosInstance = axios.create();
      const mockCtx = {
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        getCustomHostSettings: () => undefined,
        getToken: async () => null,
        proxySettings: undefined,
        sslSettings: { verificationMode: 'full' as const },
      } as unknown as AuthContext;

      await AzureSharedKeyAuth.configure(mockCtx, axiosInstance, {
        accountName: 'myaccount',
        accountKey: 'dGVzdGtleQ==',
      });

      await expect(
        axiosInstance.get('https://myaccount.blob.core.windows.net/?comp=list')
      ).rejects.toThrow('query params must be passed via config.params');
    });
  });

  describe('buildCanonicalizedHeaders', () => {
    it('includes only x-ms-* headers, lowercased and sorted', () => {
      const headers: Record<string, string> = {
        'x-ms-version': '2021-06-08',
        'x-ms-date': 'Sat, 21 Feb 2015 00:48:38 GMT',
        'Content-Type': 'application/json',
      };
      const result = buildCanonicalizedHeaders(headers);
      expect(result).toBe('x-ms-date:Sat, 21 Feb 2015 00:48:38 GMT\nx-ms-version:2021-06-08\n');
    });

    it('returns empty string when no x-ms- headers', () => {
      expect(buildCanonicalizedHeaders({ 'Content-Type': 'application/json' })).toBe('');
    });
  });

  describe('buildCanonicalizedResource', () => {
    it('builds /accountName/path with no query params', () => {
      expect(buildCanonicalizedResource('myaccount', '/mycontainer', {})).toBe(
        '/myaccount/mycontainer'
      );
    });

    it('appends sorted query params as key:value', () => {
      expect(
        buildCanonicalizedResource('myaccount', '/mycontainer', {
          restype: 'container',
          comp: 'list',
        })
      ).toBe('/myaccount/mycontainer\ncomp:list\nrestype:container');
    });

    it('handles path without leading slash', () => {
      expect(buildCanonicalizedResource('myaccount', 'mycontainer', {})).toBe(
        '/myaccount/mycontainer'
      );
    });
  });

  describe('buildStringToSign', () => {
    it('uses empty Date when x-ms-date is present', () => {
      const requestHeaders: Record<string, string> = {
        'x-ms-date': 'Sat, 21 Feb 2015 00:48:38 GMT',
        'x-ms-version': '2021-06-08',
      };
      const canonicalizedHeaders = buildCanonicalizedHeaders(requestHeaders);
      const canonicalizedResource = '/myaccount/mycontainer\ncomp:list';
      const result = buildStringToSign(
        'GET',
        requestHeaders,
        canonicalizedHeaders,
        canonicalizedResource
      );
      const lines = result.split('\n');
      expect(lines[0]).toBe('GET');
      expect(lines[6]).toBe(''); // Date line empty when x-ms-date is set
      expect(result).toContain(canonicalizedHeaders);
      expect(result).toContain(canonicalizedResource);
    });

    it('uses Content-Length empty when 0', () => {
      const requestHeaders: Record<string, string> = {
        'x-ms-date': 'Sat, 21 Feb 2015 00:48:38 GMT',
        'content-length': '0',
      };
      const result = buildStringToSign('GET', requestHeaders, '', '/myaccount/');
      const lines = result.split('\n');
      expect(lines[3]).toBe(''); // content-length
    });
  });
});
