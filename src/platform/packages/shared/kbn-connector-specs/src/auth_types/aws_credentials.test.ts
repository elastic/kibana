/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AxiosHeaders } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { AuthContext } from '../connector_spec';
import { AwsCredentialsAuth } from './aws_credentials';

// The jest environment has no Web Crypto; fake the hash/signature primitives.
jest.mock('./aws_crypto_helpers', () => ({
  sha256Hash: jest.fn(async () => 'aa'.repeat(32)),
  calculateAWSA4Signature: jest.fn(async () => 'bb'.repeat(32)),
}));

const SECRET = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
};

const mockContext = {} as AuthContext;

type RequestInterceptor = (
  config: InternalAxiosRequestConfig
) => Promise<InternalAxiosRequestConfig>;

async function getInterceptor(): Promise<RequestInterceptor> {
  let interceptor: RequestInterceptor | undefined;
  const axiosInstance = {
    interceptors: {
      request: {
        use: (fn: RequestInterceptor) => {
          interceptor = fn;
        },
      },
    },
  } as unknown as AxiosInstance;

  await AwsCredentialsAuth.configure(mockContext, axiosInstance, SECRET);
  if (!interceptor) {
    throw new Error('AwsCredentialsAuth did not register a request interceptor');
  }
  return interceptor;
}

describe('AwsCredentialsAuth', () => {
  it('signs requests to *.amazonaws.com and leaves other hosts untouched', async () => {
    const interceptor = await getInterceptor();

    const awsConfig = {
      url: 'https://lambda.us-east-1.amazonaws.com/2015-03-31/functions/',
      method: 'get',
      headers: new AxiosHeaders(),
    } as unknown as InternalAxiosRequestConfig;
    const signed = await interceptor(awsConfig);
    expect(signed.headers.get('Authorization')).toContain('AWS4-HMAC-SHA256');

    const nonAwsConfig = {
      url: 'https://example.com/foo',
      method: 'get',
      headers: new AxiosHeaders(),
    } as unknown as InternalAxiosRequestConfig;
    const unsigned = await interceptor(nonAwsConfig);
    expect(unsigned.headers.get('Authorization')).toBeUndefined();
  });

  // Regression test: query params passed via axios's `params` option (as
  // opposed to being baked into the URL string already) are not merged into
  // `config.url` until *after* request interceptors run (axios's
  // dispatchRequest/buildURL step). Reading only `new URL(config.url).search`
  // — as this interceptor originally did — sees an empty query string, signs
  // that, and then axios appends the real `params` afterwards using its own
  // encoding (which un-escapes `,`, `:`, `$`, and turns spaces into `+`).
  // Either gap makes the signed request diverge from the one actually sent,
  // and AWS rejects the mismatch with a blanket access-denied error.
  it('folds axios `params` into the signature and bakes the exact signed query string into config.url', async () => {
    const interceptor = await getInterceptor();

    const config = {
      url: 'https://search-my-domain-abc123.us-east-1.es.amazonaws.com/_cat/indices',
      method: 'get',
      params: { format: 'json', h: 'health,status,index,docs.count,store.size' },
      headers: new AxiosHeaders(),
    } as unknown as InternalAxiosRequestConfig;

    const result = await interceptor(config);

    // `params` must be cleared so axios's own serializer doesn't re-append
    // (and re-encode) the query string on top of what we already baked in.
    expect(result.params).toBeUndefined();
    expect(result.url).toBe(
      'https://search-my-domain-abc123.us-east-1.es.amazonaws.com/_cat/indices' +
        '?format=json&h=health%2Cstatus%2Cindex%2Cdocs.count%2Cstore.size'
    );
    expect(result.headers.get('Authorization')).toContain('AWS4-HMAC-SHA256');
  });

  it('drops null/undefined-valued params the same way axios’ own params serializer does', async () => {
    const interceptor = await getInterceptor();

    const config = {
      url: 'https://search-my-domain-abc123.us-east-1.es.amazonaws.com/_plugins/_alerting/monitors/alerts',
      method: 'get',
      params: { monitorId: undefined, alertState: 'ACTIVE', severityLevel: null },
      headers: new AxiosHeaders(),
    } as unknown as InternalAxiosRequestConfig;

    const result = await interceptor(config);

    expect(result.url).toBe(
      'https://search-my-domain-abc123.us-east-1.es.amazonaws.com/_plugins/_alerting/monitors/alerts?alertState=ACTIVE'
    );
  });

  // Regression test: a path segment built with `encodeURIComponent` (e.g. an
  // index pattern like "logs-*") leaves `*` unescaped. AWS's SigV4
  // canonicalization on the receiving end percent-encodes it, so an
  // unescaped `*` in the literal request path/query causes a signature
  // mismatch even though the client's own signing and wire bytes agree with
  // each other.
  it('percent-encodes RFC-3986 reserved characters left unescaped in the path and query by encodeURIComponent', async () => {
    const interceptor = await getInterceptor();

    const config = {
      url: `https://search-my-domain-abc123.us-east-1.es.amazonaws.com/_cat/indices/${encodeURIComponent(
        'logs-*'
      )}`,
      method: 'get',
      params: { h: 'name,health,pri.store.size' },
      headers: new AxiosHeaders(),
    } as unknown as InternalAxiosRequestConfig;

    const result = await interceptor(config);

    expect(result.url).toBe(
      'https://search-my-domain-abc123.us-east-1.es.amazonaws.com/_cat/indices/logs-%2A' +
        '?h=name%2Chealth%2Cpri.store.size'
    );
  });

  it('merges params already embedded in the URL string with axios `params`', async () => {
    const interceptor = await getInterceptor();

    const config = {
      url: 'https://search-my-domain-abc123.us-east-1.es.amazonaws.com/_search?scroll=1m',
      method: 'post',
      params: { size: 50 },
      headers: new AxiosHeaders(),
    } as unknown as InternalAxiosRequestConfig;

    const result = await interceptor(config);

    expect(result.url).toBe(
      'https://search-my-domain-abc123.us-east-1.es.amazonaws.com/_search?scroll=1m&size=50'
    );
  });
});
