/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Agent as HttpsAgent } from 'https';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { Logger } from '@kbn/logging';
import { getCustomAgents } from './get_custom_agents';
import type { CustomHostSettings, ProxySettings, SSLSettings } from './types';

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const targetHost = 'elastic.co';
const targetUrl = `https://${targetHost}/foo/bar/baz`;
const targetUrlCanonical = `https://${targetHost}:443`;
const nonMatchingUrl = `https://${targetHost}m/foo/bar/baz`;

const defaultSSLSettings = {
  verificationMode: 'full',
} as SSLSettings;

describe('getCustomAgents', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('get agents for valid proxy URL', () => {
    const proxySettings = {
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    } as ProxySettings;
    const { httpAgent, httpsAgent } = getCustomAgents({
      logger,
      proxySettings,
      sslSettings: defaultSSLSettings,
      url: targetUrl,
    });
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
  });

  test('return default agents for invalid proxy URL', () => {
    const proxySettings = {
      proxyUrl: ':nope: not a valid URL',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    } as ProxySettings;
    const { httpAgent, httpsAgent } = getCustomAgents({
      logger,
      proxySettings,
      sslSettings: defaultSSLSettings,
      url: targetUrl,
    });
    expect(httpAgent).toBe(undefined);
    expect(httpsAgent instanceof HttpsAgent).toBeTruthy();
  });

  test('return default agents for undefined proxy options', () => {
    const { httpAgent, httpsAgent } = getCustomAgents({
      logger,
      sslSettings: defaultSSLSettings,
      url: targetUrl,
    });
    expect(httpAgent).toBe(undefined);
    expect(httpsAgent instanceof HttpsAgent).toBeTruthy();
  });

  test('returns non-proxy agents for matching proxyBypassHosts', () => {
    const proxySettings = {
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: new Set([targetHost]),
      proxyOnlyHosts: undefined,
    } as ProxySettings;
    const { httpAgent, httpsAgent } = getCustomAgents({
      logger,
      proxySettings,
      sslSettings: defaultSSLSettings,
      url: targetUrl,
    });
    expect(httpAgent instanceof HttpProxyAgent).toBeFalsy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeFalsy();
  });

  test('returns proxy agents for non-matching proxyBypassHosts', () => {
    const proxySettings = {
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: new Set([targetHost]),
      proxyOnlyHosts: undefined,
    } as ProxySettings;

    const { httpAgent, httpsAgent } = getCustomAgents({
      logger,
      proxySettings,
      sslSettings: defaultSSLSettings,
      url: nonMatchingUrl,
    });
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
  });

  test('returns proxy agents for matching proxyOnlyHosts', () => {
    const proxySettings = {
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: new Set([targetHost]),
    } as ProxySettings;

    const { httpAgent, httpsAgent } = getCustomAgents({
      logger,
      proxySettings,
      sslSettings: defaultSSLSettings,
      url: targetUrl,
    });
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
  });

  test('returns non-proxy agents for non-matching proxyOnlyHosts', () => {
    const proxySettings = {
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: new Set([targetHost]),
    } as ProxySettings;

    const { httpAgent, httpsAgent } = getCustomAgents({
      logger,
      proxySettings,
      sslSettings: defaultSSLSettings,
      url: nonMatchingUrl,
    });
    expect(httpAgent instanceof HttpProxyAgent).toBeFalsy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeFalsy();
  });

  test('handles custom host settings', () => {
    const customHostSettings = {
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'none',
        certificateAuthoritiesData: 'ca data here',
      },
    } as CustomHostSettings;

    const { httpsAgent } = getCustomAgents({
      customHostSettings,
      logger,
      sslSettings: defaultSSLSettings,
      url: targetUrl,
    });
    expect(httpsAgent?.options.ca).toBe('ca data here');
    expect(httpsAgent?.options.rejectUnauthorized).toBe(false);
  });

  test('handles custom host settings with proxy', () => {
    const proxySettings = {
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    } as ProxySettings;
    const customHostSettings = {
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'none',
        certificateAuthoritiesData: 'ca data here',
      },
    } as CustomHostSettings;

    const { httpAgent, httpsAgent } = getCustomAgents({
      customHostSettings,
      logger,
      proxySettings,
      sslSettings: defaultSSLSettings,
      url: targetUrl,
    });
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();

    expect(httpsAgent?.options.ca).toBe('ca data here');
    expect(httpsAgent?.options.rejectUnauthorized).toBe(false);
  });

  test('handles overriding global verificationMode "none"', () => {
    const sslSettings = {
      verificationMode: 'none',
    } as SSLSettings;
    const customHostSettings = {
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'certificate',
      },
    } as CustomHostSettings;

    const { httpAgent, httpsAgent } = getCustomAgents({
      customHostSettings,
      logger,
      sslSettings,
      url: targetUrl,
    });

    expect(httpAgent instanceof HttpProxyAgent).toBeFalsy();
    expect(httpsAgent instanceof HttpsAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeFalsy();
    expect(httpsAgent?.options.rejectUnauthorized).toBeTruthy();
  });

  test('handles overriding global verificationMode "full"', () => {
    const sslSettings = {
      verificationMode: 'full',
    } as SSLSettings;
    const customHostSettings = {
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'none',
      },
    } as CustomHostSettings;

    const { httpAgent, httpsAgent } = getCustomAgents({
      customHostSettings,
      logger,
      sslSettings,
      url: targetUrl,
    });

    expect(httpAgent instanceof HttpProxyAgent).toBeFalsy();
    expect(httpsAgent instanceof HttpsAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeFalsy();
    expect(httpsAgent?.options.rejectUnauthorized).toBeFalsy();
  });

  test('handles overriding global verificationMode "none" with a proxy', () => {
    const sslSettings = {
      verificationMode: 'none',
    } as SSLSettings;
    const customHostSettings = {
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'full',
      },
    } as CustomHostSettings;
    const proxySettings = {
      proxyUrl: 'https://someproxyhost',
      // note: this setting doesn't come into play, it's for the connection to
      // the proxy, not the target url
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    } as ProxySettings;

    const { httpAgent, httpsAgent } = getCustomAgents({
      customHostSettings,
      logger,
      proxySettings,
      sslSettings,
      url: targetUrl,
    });

    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
    expect(httpsAgent?.options.rejectUnauthorized).toBeTruthy();
  });

  test('handles overriding global verificationMode "full" with a proxy', () => {
    const sslSettings = {
      verificationMode: 'full',
    } as SSLSettings;
    const customHostSettings = {
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'none',
      },
    } as CustomHostSettings;
    const proxySettings = {
      proxyUrl: 'https://someproxyhost',
      // note: this setting doesn't come into play, it's for the connection to
      // the proxy, not the target url
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    } as ProxySettings;

    const { httpAgent, httpsAgent } = getCustomAgents({
      customHostSettings,
      logger,
      proxySettings,
      sslSettings,
      url: targetUrl,
    });
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
    expect(httpsAgent?.options.rejectUnauthorized).toBeFalsy();
  });
});
