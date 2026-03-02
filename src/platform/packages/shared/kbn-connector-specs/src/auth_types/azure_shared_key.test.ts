/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
