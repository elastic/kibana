/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  KibanaRequest,
  RouteMethod,
  KibanaRouteOptions,
  OnPostAuthToolkit,
} from '@kbn/core-http-server';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import {
  classifyProvenance,
  createProvenanceTelemetryPostAuthHandler,
  isLikelyModernBrowser,
  PROVENANCE_TELEMETRY_COUNTER_TYPE,
} from './provenance_telemetry';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const FIREFOX_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0';
const CLI_UA = 'curl/8.1.2';
const IE_UA = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)';
const HEADLESS_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0 Safari/537.36';
const OVERSIZE_UA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 ${'A'.repeat(
  500
)}`;

const forgeRequest = ({
  headers = {},
  path = '/api/test',
  method = 'post',
  kibanaRouteOptions,
}: Partial<{
  headers: Record<string, string>;
  path: string;
  method: RouteMethod;
  kibanaRouteOptions: KibanaRouteOptions;
}>): KibanaRequest => mockRouter.createKibanaRequest({ headers, path, method, kibanaRouteOptions });

const createToolkit = (): jest.Mocked<OnPostAuthToolkit> => ({
  next: jest.fn().mockReturnValue('next'),
  authzResultNext: jest.fn(),
});

const createConfig = (partial?: { disableProtection?: boolean; allowlist?: string[] }) => ({
  xsrf: {
    disableProtection: partial?.disableProtection ?? false,
    allowlist: partial?.allowlist ?? [],
  },
});

describe('classifyProvenance', () => {
  it('buckets a known Sec-Fetch-Site value', () => {
    expect(
      classifyProvenance(forgeRequest({ headers: { 'sec-fetch-site': 'cross-site' } }))
        .secFetchSiteBucket
    ).toBe('cross-site');
    expect(
      classifyProvenance(forgeRequest({ headers: { 'sec-fetch-site': 'same-origin' } }))
        .secFetchSiteBucket
    ).toBe('same-origin');
  });

  it('reports "absent" when Sec-Fetch-Site is missing and folds unknown values into "other"', () => {
    expect(classifyProvenance(forgeRequest({ headers: {} })).secFetchSiteBucket).toBe('absent');
    expect(
      classifyProvenance(forgeRequest({ headers: { 'sec-fetch-site': 'bogus' } }))
        .secFetchSiteBucket
    ).toBe('other');
  });

  it('buckets known Sec-Fetch-Mode values and records presence of Origin without capturing values', () => {
    const classification = classifyProvenance(
      forgeRequest({ headers: { 'sec-fetch-mode': 'cors', origin: 'https://evil.example' } })
    );
    expect(classification.secFetchModeBucket).toBe('cors');
    expect(classification.originPresent).toBe(true);
    expect(Object.values(classification)).not.toContain('https://evil.example');
  });

  it('reports "absent" when Sec-Fetch-Mode is missing and folds unknown values into "other"', () => {
    expect(classifyProvenance(forgeRequest({ headers: {} })).secFetchModeBucket).toBe('absent');
    expect(
      classifyProvenance(forgeRequest({ headers: { 'sec-fetch-mode': 'navigate' } }))
        .secFetchModeBucket
    ).toBe('navigate');
    expect(
      classifyProvenance(forgeRequest({ headers: { 'sec-fetch-mode': 'bogus' } }))
        .secFetchModeBucket
    ).toBe('other');
  });

  it('distinguishes browser vs non-browser user agents', () => {
    expect(
      classifyProvenance(forgeRequest({ headers: { 'user-agent': BROWSER_UA } })).isBrowserUa
    ).toBe(true);
    expect(
      classifyProvenance(forgeRequest({ headers: { 'user-agent': CLI_UA } })).isBrowserUa
    ).toBe(false);
    expect(classifyProvenance(forgeRequest({ headers: {} })).isBrowserUa).toBe(false);
  });

  it('flags the browser-without-provenance gap', () => {
    expect(
      classifyProvenance(forgeRequest({ headers: { 'user-agent': BROWSER_UA } }))
        .gapBrowserMissingProvenance
    ).toBe(true);
    // Origin present -> not a gap
    expect(
      classifyProvenance(
        forgeRequest({ headers: { 'user-agent': BROWSER_UA, origin: 'https://kibana.example' } })
      ).gapBrowserMissingProvenance
    ).toBe(false);
    // Sec-Fetch-Site present -> not a gap
    expect(
      classifyProvenance(
        forgeRequest({ headers: { 'user-agent': BROWSER_UA, 'sec-fetch-site': 'same-origin' } })
      ).gapBrowserMissingProvenance
    ).toBe(false);
    // Non-browser without provenance -> not a gap
    expect(
      classifyProvenance(forgeRequest({ headers: { 'user-agent': CLI_UA } }))
        .gapBrowserMissingProvenance
    ).toBe(false);
  });

  it('would block only cross-site requests under the proposed provenance model', () => {
    expect(
      classifyProvenance(forgeRequest({ headers: { 'sec-fetch-site': 'cross-site' } })).wouldBlock
    ).toBe(true);
    expect(
      classifyProvenance(forgeRequest({ headers: { 'sec-fetch-site': 'same-site' } })).wouldBlock
    ).toBe(false);
    expect(classifyProvenance(forgeRequest({ headers: {} })).wouldBlock).toBe(false);
  });
});

describe('isLikelyModernBrowser', () => {
  it('accepts modern Chrome and Firefox user agents', () => {
    expect(isLikelyModernBrowser(BROWSER_UA)).toBe(true);
    expect(isLikelyModernBrowser(FIREFOX_UA)).toBe(true);
  });

  it('rejects non-browser, old-style bot/IE, headless, and oversize user agents', () => {
    expect(isLikelyModernBrowser(CLI_UA)).toBe(false);
    expect(isLikelyModernBrowser(IE_UA)).toBe(false);
    expect(isLikelyModernBrowser(HEADLESS_UA)).toBe(false);
    expect(isLikelyModernBrowser(OVERSIZE_UA)).toBe(false);
    expect(isLikelyModernBrowser(undefined)).toBe(false);
    expect(isLikelyModernBrowser('')).toBe(false);
  });
});

describe('createProvenanceTelemetryPostAuthHandler', () => {
  const responseFactory = mockRouter.createResponseFactory();

  afterEach(() => jest.clearAllMocks());

  it('skips safe methods without counting', () => {
    const incrementCounter = jest.fn();
    const toolkit = createToolkit();
    const handler = createProvenanceTelemetryPostAuthHandler(createConfig, incrementCounter);

    handler(forgeRequest({ method: 'get' }), responseFactory, toolkit);

    expect(incrementCounter).not.toHaveBeenCalled();
    expect(toolkit.next).toHaveBeenCalledTimes(1);
  });

  it('emits one counter per dimension for a state-changing request and never blocks', () => {
    const incrementCounter = jest.fn();
    const toolkit = createToolkit();
    const handler = createProvenanceTelemetryPostAuthHandler(createConfig, incrementCounter);

    const result = handler(
      forgeRequest({
        method: 'post',
        headers: {
          'sec-fetch-site': 'cross-site',
          'sec-fetch-mode': 'cors',
          origin: 'https://evil.example',
          'user-agent': BROWSER_UA,
        },
      }),
      responseFactory,
      toolkit
    );

    const counterNames = incrementCounter.mock.calls.map(([params]) => params.counterName);
    expect(counterNames).toEqual([
      'sec_fetch_site:cross-site',
      'sec_fetch_mode:cors',
      'origin:present',
      'user_agent:browser',
      'provenance_decision:would_block',
      'method:post',
      'route_access:internal',
    ]);
    expect(incrementCounter).toHaveBeenCalledWith(
      expect.objectContaining({ counterType: PROVENANCE_TELEMETRY_COUNTER_TYPE })
    );
    expect(responseFactory.badRequest).not.toHaveBeenCalled();
    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(result).toBe('next');
  });

  it('counts the gap bucket for a browser request missing provenance headers', () => {
    const incrementCounter = jest.fn();
    const toolkit = createToolkit();
    const handler = createProvenanceTelemetryPostAuthHandler(createConfig, incrementCounter);

    handler(
      forgeRequest({ method: 'post', headers: { 'user-agent': BROWSER_UA } }),
      responseFactory,
      toolkit
    );

    const counterNames = incrementCounter.mock.calls.map(([params]) => params.counterName);
    expect(counterNames).toEqual([
      'sec_fetch_site:absent',
      'sec_fetch_mode:absent',
      'origin:absent',
      'user_agent:browser',
      'provenance_decision:would_allow',
      'method:post',
      'route_access:internal',
      'gap:browser_missing_provenance',
    ]);
  });

  it('slices counts by HTTP method and public vs internal route access', () => {
    const incrementCounter = jest.fn();
    const toolkit = createToolkit();
    const handler = createProvenanceTelemetryPostAuthHandler(createConfig, incrementCounter);

    handler(
      forgeRequest({
        method: 'delete',
        kibanaRouteOptions: { xsrfRequired: true, access: 'public' } as KibanaRouteOptions,
      }),
      responseFactory,
      toolkit
    );

    const counterNames = incrementCounter.mock.calls.map(([params]) => params.counterName);
    expect(counterNames).toContain('method:delete');
    expect(counterNames).toContain('route_access:public');
  });

  it('mirrors enforcement scope: does not count when protection is disabled', () => {
    const incrementCounter = jest.fn();
    const toolkit = createToolkit();
    const handler = createProvenanceTelemetryPostAuthHandler(
      () => createConfig({ disableProtection: true }),
      incrementCounter
    );

    handler(forgeRequest({ method: 'post' }), responseFactory, toolkit);

    expect(incrementCounter).not.toHaveBeenCalled();
    expect(toolkit.next).toHaveBeenCalledTimes(1);
  });

  it('mirrors enforcement scope: does not count allowlisted paths or xsrf-exempt routes', () => {
    const incrementCounter = jest.fn();
    const toolkit = createToolkit();

    const allowlistHandler = createProvenanceTelemetryPostAuthHandler(
      () => createConfig({ allowlist: ['/api/test'] }),
      incrementCounter
    );
    allowlistHandler(forgeRequest({ method: 'post', path: '/api/test' }), responseFactory, toolkit);
    expect(incrementCounter).not.toHaveBeenCalled();

    const exemptHandler = createProvenanceTelemetryPostAuthHandler(createConfig, incrementCounter);
    exemptHandler(
      forgeRequest({ method: 'post', kibanaRouteOptions: { xsrfRequired: false } as any }),
      responseFactory,
      toolkit
    );
    expect(incrementCounter).not.toHaveBeenCalled();
  });

  it('does not count when config is not yet available', () => {
    const incrementCounter = jest.fn();
    const toolkit = createToolkit();
    const handler = createProvenanceTelemetryPostAuthHandler(() => undefined, incrementCounter);

    handler(forgeRequest({ method: 'post' }), responseFactory, toolkit);

    expect(incrementCounter).not.toHaveBeenCalled();
    expect(toolkit.next).toHaveBeenCalledTimes(1);
  });
});
