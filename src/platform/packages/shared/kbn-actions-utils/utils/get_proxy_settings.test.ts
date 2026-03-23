/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getProxySettings } from './get_proxy_settings';

describe('getProxySettings', () => {
  it('should return undefined when proxyUrl is not provided', () => {
    expect(getProxySettings({})).toBeUndefined();
  });

  it('should return undefined when proxyUrl is an empty string', () => {
    expect(getProxySettings({ url: '' })).toBeUndefined();
  });

  it('should return proxy settings with default verificationMode "full"', () => {
    const result = getProxySettings({ url: 'https://proxy.example.com:8080' });

    expect(result).toEqual({
      proxyUrl: 'https://proxy.example.com:8080/',
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
      proxySSLSettings: { verificationMode: 'full' },
    });
  });

  it('should use the provided proxyVerificationMode', () => {
    const result = getProxySettings({
      url: 'https://proxy.example.com:8080',
      verificationMode: 'none',
    });

    expect(result?.proxySSLSettings.verificationMode).toBe('none');
  });

  it('should embed credentials in the proxy URL when hasProxyAuth and credentials are provided', () => {
    const result = getProxySettings({
      url: 'https://proxy.example.com:8080',
      hasAuth: true,
      username: 'user',
      password: 'pass',
    });

    expect(result?.proxyUrl).toBe('https://user:pass@proxy.example.com:8080/');
  });

  it('should not embed credentials when hasProxyAuth is false', () => {
    const result = getProxySettings({
      url: 'https://proxy.example.com:8080',
      hasAuth: false,
      username: 'user',
      password: 'pass',
    });

    expect(result?.proxyUrl).toBe('https://proxy.example.com:8080/');
  });

  it('should not embed credentials when proxyUsername is missing', () => {
    const result = getProxySettings({
      url: 'https://proxy.example.com:8080',
      hasAuth: true,
      password: 'pass',
    });

    expect(result?.proxyUrl).toBe('https://proxy.example.com:8080/');
  });

  it('should not embed credentials when proxyPassword is missing', () => {
    const result = getProxySettings({
      url: 'https://proxy.example.com:8080',
      hasAuth: true,
      username: 'user',
    });

    expect(result?.proxyUrl).toBe('https://proxy.example.com:8080/');
  });

  it('should URL-encode special characters in credentials', () => {
    const result = getProxySettings({
      url: 'https://proxy.example.com:8080',
      hasAuth: true,
      username: 'user@domain',
      password: 'p@ss:word',
    });

    expect(result?.proxyUrl).toBe('https://user%40domain:p%40ss%3Aword@proxy.example.com:8080/');
  });

  it('should convert bypassHosts array to a Set', () => {
    const result = getProxySettings({
      url: 'https://proxy.example.com:8080',
      bypassHosts: ['localhost', 'internal.example.com'],
    });

    expect(result?.proxyBypassHosts).toEqual(new Set(['localhost', 'internal.example.com']));
  });

  it('should convert onlyHosts array to a Set', () => {
    const result = getProxySettings({
      url: 'https://proxy.example.com:8080',
      onlyHosts: ['api.example.com'],
    });

    expect(result?.proxyOnlyHosts).toEqual(new Set(['api.example.com']));
  });

  it('should pass through headers', () => {
    const headers = { 'Proxy-Authorization': 'Basic abc123' };
    const result = getProxySettings({
      url: 'https://proxy.example.com:8080',
      headers,
    });

    expect(result?.proxyHeaders).toBe(headers);
  });
});
