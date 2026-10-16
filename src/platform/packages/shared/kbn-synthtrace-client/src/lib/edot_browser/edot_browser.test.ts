/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asFloat } from './as_float';
import { BROWSER_PROFILES, pickBrowserProfile } from './browser_profiles';
import { HEALTH_PROFILES, getWebVitalRating } from './health_profiles';
import { edotBrowser } from '.';

const LOGS_INDEX = 'logs-generic.otel-default';
const TRACES_INDEX = 'traces-generic.otel-default';
const TIMESTAMP = new Date('2026-10-16T12:00:00.000Z').getTime();

const resourceTimings = {
  duration: 120,
  fetchStart: 10,
  domainLookupStart: 10,
  domainLookupEnd: 20,
  connectStart: 20,
  connectEnd: 40,
  secureConnectionStart: 25,
  requestStart: 40,
  responseStart: 100,
  responseEnd: 130,
  transferSize: 5120,
  encodedBodySize: 4800,
  decodedBodySize: 16000,
};

const createClient = (sessionId?: string) =>
  edotBrowser
    .app({ serviceName: 'storefront-web', serviceVersion: '1.2.3', environment: 'production' })
    .client(BROWSER_PROFILES.chromeMacos, { sessionId });

const hasFractionalPart = (value: number) => JSON.stringify(value).includes('.');

describe('edotBrowser', () => {
  describe('asFloat', () => {
    it('rounds to 0.1 precision by default', () => {
      expect(asFloat(123.456)).toBe(123.5);
    });

    it('keeps a fractional part after JSON serialization for integral values', () => {
      [0, 1, 2.0, 1234, 1234.04, 99.96].forEach((value) => {
        const result = asFloat(value);
        expect(hasFractionalPart(result)).toBe(true);
        expect(Math.abs(result - value)).toBeLessThan(0.1);
      });
    });

    it('supports a custom precision', () => {
      expect(asFloat(0.123456, 4)).toBe(0.1235);
      expect(hasFractionalPart(asFloat(0, 4))).toBe(true);
      expect(asFloat(0, 4)).toBeLessThan(0.0001);
    });
  });

  describe('browser profiles', () => {
    it('has matching browser attributes and user agents', () => {
      const uaTokens: Record<string, string> = {
        Chrome: 'Chrome/',
        Edge: 'Edg/',
        Firefox: 'Firefox/',
        Safari: 'Version/',
      };
      Object.values(BROWSER_PROFILES).forEach(({ resourceAttributes }) => {
        const userAgent = resourceAttributes['user_agent.original'];
        expect(userAgent).toContain(
          `${uaTokens[resourceAttributes['browser.name']]}${resourceAttributes['browser.version']}`
        );
        expect(typeof resourceAttributes['browser.mobile']).toBe('boolean');
        expect(resourceAttributes['browser.language']).toBeTruthy();
      });
    });

    it('only sets browser.brands for Chromium-based browsers', () => {
      expect(BROWSER_PROFILES.chromeMacos.resourceAttributes['browser.brands']).toBeDefined();
      expect(BROWSER_PROFILES.firefoxLinux.resourceAttributes).not.toHaveProperty(
        'browser.brands'
      );
      expect(BROWSER_PROFILES.safariIos.resourceAttributes).not.toHaveProperty('browser.brands');
    });

    it('picks a profile from the weighted set', () => {
      const profiles = Object.values(BROWSER_PROFILES);
      expect(profiles).toContain(pickBrowserProfile());
      expect(pickBrowserProfile(() => 0)).toBe(profiles[0]);
      expect(pickBrowserProfile(() => 0.999999)).toBe(profiles[profiles.length - 1]);
    });
  });

  describe('health profiles', () => {
    it('rates web vitals using the web-vitals thresholds', () => {
      expect(getWebVitalRating('lcp', 2500)).toBe('good');
      expect(getWebVitalRating('lcp', 2501)).toBe('needs-improvement');
      expect(getWebVitalRating('lcp', 4001)).toBe('poor');
      expect(getWebVitalRating('inp', 199)).toBe('good');
      expect(getWebVitalRating('inp', 501)).toBe('poor');
      expect(getWebVitalRating('cls', 0.1)).toBe('good');
      expect(getWebVitalRating('cls', 0.2)).toBe('needs-improvement');
      expect(getWebVitalRating('fcp', 3001)).toBe('poor');
      expect(getWebVitalRating('ttfb', 900)).toBe('needs-improvement');
    });

    it('orders profiles by degrading health', () => {
      const { healthy, slow, erroring, critical } = HEALTH_PROFILES;
      expect(slow.lcp.median).toBeGreaterThan(healthy.lcp.median);
      expect(erroring.httpFailureRate).toBeGreaterThan(healthy.httpFailureRate);
      expect(critical.jsErrorRate).toBeGreaterThan(healthy.jsErrorRate);
      expect(critical.inp.median).toBeGreaterThan(healthy.inp.median);
      expect(critical.cls.median).toBeGreaterThan(healthy.cls.median);
    });
  });

  describe('signal builders', () => {
    const client = createClient();

    it('writes OTel-native log docs with EDOT Browser resource attributes', () => {
      const [doc] = client
        .navigation({ url: 'https://shop.example.com/', sameDocument: false })
        .timestamp(TIMESTAMP)
        .serialize();

      expect(doc).toMatchObject({
        _index: LOGS_INDEX,
        '@timestamp': TIMESTAMP,
        observed_timestamp: TIMESTAMP,
        event_name: 'browser.navigation',
        severity_number: 9,
        scope: { name: '@opentelemetry/browser-instrumentation/navigation' },
        resource: {
          attributes: {
            'service.name': 'storefront-web',
            'service.version': '1.2.3',
            'deployment.environment.name': 'production',
            'telemetry.sdk.name': 'opentelemetry',
            'telemetry.sdk.language': 'webjs',
            'telemetry.distro.name': 'elastic',
            'browser.name': 'Chrome',
            'browser.mobile': false,
            'user_agent.original': expect.stringContaining('Chrome/'),
          },
        },
      });
      expect(doc).not.toHaveProperty('processor');
      expect(doc.attributes).not.toHaveProperty('session.id');
    });

    it('only sets browser.navigation.type for soft navigations', () => {
      const [hard] = client
        .navigation({ url: 'https://shop.example.com/', sameDocument: false })
        .serialize();
      const [soft] = client
        .navigation({ url: 'https://shop.example.com/cart', sameDocument: true, type: 'push' })
        .serialize();

      expect(hard.attributes).toEqual({
        'url.full': 'https://shop.example.com/',
        'browser.navigation.same_document': false,
        'browser.navigation.hash_change': false,
      });
      expect(soft.attributes).toMatchObject({
        'browser.navigation.same_document': true,
        'browser.navigation.type': 'push',
      });
    });

    it('writes navigation timing with float timings and integer counters', () => {
      const [doc] = client
        .navigationTiming({
          url: 'https://shop.example.com/',
          type: 'navigate',
          timings: {
            domInteractive: 800,
            domContentLoadedEventStart: 850,
            domContentLoadedEventEnd: 860,
            domComplete: 1400,
            loadEventStart: 1400,
            loadEventEnd: 1410,
            unloadEventStart: 0,
            unloadEventEnd: 0,
            redirectCount: 0,
          },
          resourceTimings,
        })
        .serialize();
      const attributes = JSON.parse(JSON.stringify(doc.attributes));
      const raw = JSON.stringify(doc.attributes);

      expect(doc.event_name).toBe('browser.navigation_timing');
      expect(attributes['browser.navigation_timing.type']).toBe('navigate');
      [
        'browser.navigation_timing.dom_complete',
        'browser.navigation_timing.unload_event_start',
        'browser.resource_timing.duration',
        'browser.resource_timing.fetch_start',
      ].forEach((key) => {
        expect(raw).toMatch(new RegExp(`"${key}":\\d+\\.\\d+`));
      });
      expect(attributes['browser.navigation_timing.redirect_count']).toBe(0);
      expect(raw).toContain('"browser.resource_timing.transfer_size":5120,');
    });

    it('writes resource timing entries', () => {
      const [doc] = client
        .resourceTiming({
          url: 'https://cdn.example.com/app.js',
          initiatorType: 'script',
          timings: resourceTimings,
          nextHopProtocol: 'h2',
          renderBlockingStatus: 'blocking',
        })
        .serialize();

      expect(doc.event_name).toBe('browser.resource_timing');
      expect(doc.scope?.name).toBe('@opentelemetry/browser-instrumentation/resource-timing');
      expect(doc.attributes).toMatchObject({
        'url.full': 'https://cdn.example.com/app.js',
        'browser.resource_timing.initiator_type': 'script',
        'browser.resource_timing.next_hop_protocol': 'h2',
        'browser.resource_timing.render_blocking_status': 'blocking',
        'browser.resource_timing.decoded_body_size': 16000,
      });
    });

    it('writes web vitals with a derived rating and a JSON attribution body', () => {
      const [doc] = client
        .webVital({
          name: 'lcp',
          value: 4100,
          id: 'v5-1-1',
          navigationType: 'navigate',
          attribution: { target: 'img.hero' },
        })
        .serialize();

      expect(doc.event_name).toBe('browser.web_vital');
      expect(doc.attributes).toMatchObject({
        'browser.web_vital.name': 'lcp',
        'browser.web_vital.rating': 'poor',
        'browser.web_vital.id': 'v5-1-1',
        'browser.web_vital.navigation_type': 'navigate',
      });
      expect(JSON.stringify(doc.attributes)).toMatch(/"browser\.web_vital\.value":4100\.\d+/);
      expect(JSON.stringify(doc.attributes)).toMatch(/"browser\.web_vital\.delta":4100\.\d+/);
      expect(JSON.parse(doc.body?.text ?? '')).toEqual({ target: 'img.hero' });
    });

    it('keeps CLS values of 0 fractional', () => {
      const [doc] = client
        .webVital({ name: 'cls', value: 0, id: 'v5-1-2', navigationType: 'navigate' })
        .serialize();

      expect(JSON.stringify(doc.attributes)).toMatch(/"browser\.web_vital\.value":0\.\d+/);
      expect(doc.attributes?.['browser.web_vital.rating']).toBe('good');
    });

    it('writes clicks and omits empty element attributes', () => {
      const [withAttributes] = client
        .click({
          pageX: 120,
          pageY: 480,
          tagName: 'BUTTON',
          cssSelector: '#add-to-cart',
          elementAttributes: { id: 'add-to-cart' },
        })
        .serialize();
      const [withoutAttributes] = client
        .click({ pageX: 1, pageY: 2, tagName: 'A', cssSelector: 'nav > a', elementAttributes: {} })
        .serialize();

      expect(withAttributes.event_name).toBe('browser.user_action.click');
      expect(withAttributes.attributes).toEqual({
        'browser.page.x': 120,
        'browser.page.y': 480,
        'browser.tag_name': 'BUTTON',
        'browser.css_selector': '#add-to-cart',
        'browser.mouse_event.button': 0,
        'browser.element.attributes': { id: 'add-to-cart' },
      });
      expect(withoutAttributes.attributes).not.toHaveProperty('browser.element.attributes');
    });

    it('writes exceptions with ERROR severity', () => {
      const [doc] = client
        .exception({ type: 'TypeError', message: 'x is undefined', stacktrace: 'TypeError: ...' })
        .serialize();

      expect(doc).toMatchObject({
        event_name: 'exception',
        severity_number: 17,
        scope: { name: '@opentelemetry/browser-instrumentation/errors' },
        attributes: {
          'exception.type': 'TypeError',
          'exception.message': 'x is undefined',
          'exception.stacktrace': 'TypeError: ...',
        },
      });
    });

    it('writes successful fetch requests as OTel-native CLIENT spans', () => {
      const [doc] = client
        .httpRequest({ method: 'GET', url: 'https://api.example.com/products?page=2', statusCode: 200 })
        .timestamp(TIMESTAMP)
        .duration(150.5)
        .serialize();

      expect(doc).toMatchObject({
        _index: TRACES_INDEX,
        '@timestamp': TIMESTAMP,
        name: 'GET',
        kind: 'Client',
        duration: 150500000,
        status: { code: 'Unset' },
        scope: { name: '@opentelemetry/browser-instrumentation/fetch' },
        resource: { attributes: { 'service.name': 'storefront-web' } },
        attributes: {
          'http.request.method': 'GET',
          'url.full': 'https://api.example.com/products?page=2',
          'server.address': 'api.example.com',
          'server.port': 443,
          'http.response.status_code': 200,
        },
      });
      expect(doc.trace_id).toHaveLength(32);
      expect(doc.span_id).toHaveLength(16);
      expect(doc.attributes).not.toHaveProperty('error.type');
      expect(doc.attributes).not.toHaveProperty('event.outcome');
    });

    it('marks failed XHR requests and network errors as errors', () => {
      const [failed] = client
        .httpRequest({
          method: 'POST',
          url: 'http://localhost:8080/api/payment',
          statusCode: 502,
          instrumentation: 'xhr',
        })
        .serialize();
      const [networkError] = client
        .httpRequest({ method: 'GET', url: 'https://api.example.com/x', errorType: 'TypeError' })
        .serialize();

      expect(failed).toMatchObject({
        status: { code: 'Error' },
        scope: { name: '@opentelemetry/browser-instrumentation/xhr' },
        attributes: {
          'server.port': 8080,
          'http.response.status_code': 502,
          'error.type': '502',
        },
      });
      expect(networkError.status).toEqual({ code: 'Error' });
      expect(networkError.attributes).toMatchObject({ 'error.type': 'TypeError' });
      expect(networkError.attributes).not.toHaveProperty('http.response.status_code');
    });

    it('stamps session.id on logs and spans when the client has a session', () => {
      const sessionClient = createClient('session-1');
      const [log] = sessionClient
        .exception({ type: 'Error', message: 'boom', stacktrace: '' })
        .serialize();
      const [span] = sessionClient
        .httpRequest({ method: 'GET', url: 'https://api.example.com/', statusCode: 200 })
        .serialize();

      expect(log.attributes?.['session.id']).toBe('session-1');
      expect(span.attributes['session.id']).toBe('session-1');
    });
  });
});
