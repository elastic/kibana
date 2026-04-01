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
  computeSignature,
  AzureSharedKeyAuth,
} from './azure_shared_key';

describe('Azure Shared Key auth', () => {
  describe('AzureSharedKeyAuth', () => {
    it('has id azure_shared_key and schema with accountName and accountKey', () => {
      expect(AzureSharedKeyAuth.id).toBe('azure_shared_key');
      expect(AzureSharedKeyAuth.schema.shape.accountName).toBeDefined();
      expect(AzureSharedKeyAuth.schema.shape.accountKey).toBeDefined();
    });

    it('signs GET request using encoded URI path in canonical resource for blob names with spaces', async () => {
      const accountName = 'myaccount';
      const accountKey = Buffer.from('test-key-32-bytes-long!!!!!!!!').toString('base64');

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

      const blobUrl =
        'https://myaccount.blob.core.windows.net/taracontainer2/Screen%20Recording%202026-03-12%20at%202.13.27%20PM.mov';
      await axiosInstance
        .get(blobUrl, { responseType: 'arraybuffer' })
        .catch((e: Error & { isTestStop?: boolean }) => {
          if (!e.isTestStop) throw e;
        });

      expect(capturedXMsDate).toBeDefined();
      expect(capturedAuthorization).toBeDefined();

      // Azure Shared Key canonical resource uses the encoded URI path (spaces stay as %20).
      // Azure docs: "Append the resource's encoded URI path, without any query parameters."
      // Only query parameters are URL-decoded, not the path itself.
      const canonicalHeaders = `x-ms-date:${capturedXMsDate}\nx-ms-version:2021-06-08\n`;
      const encodedCanonicalResource =
        '/myaccount/taracontainer2/Screen%20Recording%202026-03-12%20at%202.13.27%20PM.mov';
      const sts = `GET\n\n\n\n\n\n\n\n\n\n\n\n${canonicalHeaders}${encodedCanonicalResource}`;
      const expectedSig = computeSignature(sts, accountKey);
      expect(capturedAuthorization).toBe(`SharedKey myaccount:${expectedSig}`);

      // And confirm it does NOT use the decoded form
      const decodedCanonicalResource =
        '/myaccount/taracontainer2/Screen Recording 2026-03-12 at 2.13.27 PM.mov';
      const stsDecoded = `GET\n\n\n\n\n\n\n\n\n\n\n\n${canonicalHeaders}${decodedCanonicalResource}`;
      const decodedSig = computeSignature(stsDecoded, accountKey);
      expect(capturedAuthorization).not.toBe(`SharedKey myaccount:${decodedSig}`);
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

  describe('computeSignature', () => {
    it('returns deterministic base64 signature for given string and key', () => {
      const key = Buffer.from('test-key-32-bytes-long!!!!!!!!').toString('base64');
      const stringToSign =
        'GET\n\n\n\n\n\n\n\n\n\n\n\nx-ms-date:Sat, 21 Feb 2015 00:48:38 GMT\nx-ms-version:2021-06-08\n/myaccount/mycontainer\ncomp:list';
      const sig1 = computeSignature(stringToSign, key);
      const sig2 = computeSignature(stringToSign, key);
      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('produces different signature for different key', () => {
      const key1 = Buffer.from('key1----------------------------').toString('base64');
      const key2 = Buffer.from('key2----------------------------').toString('base64');
      const stringToSign = 'GET\n\n\n\n\n\n\n\n\n\n\n\n/myaccount/';
      expect(computeSignature(stringToSign, key1)).not.toBe(computeSignature(stringToSign, key2));
    });
  });
});
