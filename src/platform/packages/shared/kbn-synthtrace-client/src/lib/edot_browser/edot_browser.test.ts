/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BROWSER_PROFILES, pickBrowserProfile, type BrowserProfile } from './browser_profiles';
import { planDocuments } from './edot_browser_session';
import {
  HEALTH_PROFILES,
  getWebVitalRating,
  type Distribution,
  type HealthProfile,
} from './health_profiles';
import type { EdotBrowserSpanDocument } from './edot_browser_span';
import { edotBrowser, type EdotBrowserDocument, type EdotBrowserSite } from '.';

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

const SITE: EdotBrowserSite = {
  origin: 'https://shop.example.com',
  resources: [
    {
      path: '/static/js/main.js',
      initiatorType: 'script',
      sizeBytes: 250_000,
      renderBlocking: true,
    },
    {
      path: '/static/css/main.css',
      initiatorType: 'link',
      sizeBytes: 40_000,
      renderBlocking: true,
    },
  ],
  pages: [
    {
      path: '/',
      resources: [{ path: '/img/hero.webp', initiatorType: 'img', sizeBytes: 300_000 }],
      requests: [{ method: 'GET', url: 'https://shop.example.com/api/products' }],
    },
    {
      path: '/checkout',
      requests: [
        { method: 'GET', url: 'https://shop.example.com/api/cart', instrumentation: 'xhr' },
      ],
      clickTargets: [
        {
          tagName: 'BUTTON',
          cssSelector: '#pay-now',
          otelAttributes: { action: 'pay' },
          request: { method: 'POST', url: 'https://shop.example.com/api/payment' },
        },
      ],
    },
  ],
};

// Deterministic Park-Miller PRNG so session tests are reproducible
const seededRandom = (seed: number) => {
  let state = (seed % 2147483646) + 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const isSpan = (doc: EdotBrowserDocument): doc is EdotBrowserSpanDocument =>
  'span_id' in doc && 'kind' in doc;

const hasFractionalPart = (value: number) => JSON.stringify(value).includes('.');

describe('edotBrowser', () => {
  describe('browser profiles', () => {
    it('has matching browser attributes and user agents', () => {
      // The user agent tokens EDOT Browser reads the browser version from
      const uaTokens: Record<string, string> = {
        Chrome: 'Chrome/',
        Edge: 'Edg/',
        Firefox: 'Firefox/',
        Safari: 'Safari/',
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
      expect(BROWSER_PROFILES.firefoxLinux.resourceAttributes).not.toHaveProperty([
        'browser.brands',
      ]);
      expect(BROWSER_PROFILES.safariIos.resourceAttributes).not.toHaveProperty(['browser.brands']);
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
      expect(doc.attributes).not.toHaveProperty(['session.id']);
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
        'browser.resource_timing.duration',
        'browser.resource_timing.fetch_start',
      ].forEach((key) => {
        expect(raw).toMatch(new RegExp(`"${key}":\\d+\\.\\d+`));
      });
      expect(attributes['browser.navigation_timing.redirect_count']).toBe(0);
      expect(attributes['browser.navigation_timing.unload_event_start']).toBe(0);
      expect(attributes['browser.navigation_timing.unload_event_end']).toBe(0);
      expect(raw).toContain('"browser.resource_timing.transfer_size":5120,');
    });

    it('only writes the render-blocking status for Chromium-based browsers', () => {
      const app = edotBrowser.app({ serviceName: 'storefront-web', environment: 'production' });
      const renderBlockingStatus = (profile: BrowserProfile) => {
        const [doc] = app
          .client(profile)
          .resourceTiming({
            url: 'https://cdn.example.com/app.css',
            initiatorType: 'link',
            timings: resourceTimings,
            renderBlockingStatus: 'blocking',
          })
          .serialize();
        return doc.attributes?.['browser.resource_timing.render_blocking_status'];
      };

      expect(renderBlockingStatus(BROWSER_PROFILES.edgeWindows)).toBe('blocking');
      expect(renderBlockingStatus(BROWSER_PROFILES.firefoxLinux)).toBeUndefined();
      expect(renderBlockingStatus(BROWSER_PROFILES.safariIos)).toBeUndefined();
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
        'browser.resource_timing.redirect_start': 0,
        'browser.resource_timing.redirect_end': 0,
        'browser.resource_timing.worker_start': 0,
      });
    });

    it('writes web vitals with a derived rating and no body by default', () => {
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
      expect(doc).not.toHaveProperty('body');
    });

    it('writes the raw attribution as a JSON body when includeRawAttribution is set', () => {
      const [doc] = edotBrowser
        .app({ serviceName: 'storefront-web', environment: 'production' })
        .client(BROWSER_PROFILES.chromeMacos, { includeRawAttribution: true })
        .webVital({
          name: 'cls',
          value: 0.0213,
          id: 'v5-1-2',
          navigationType: 'navigate',
          attribution: { largestShiftTarget: 'main > div.banner', largestShiftValue: 0.021347 },
        })
        .serialize();

      expect(JSON.parse(doc.body?.text ?? '')).toEqual({
        largestShiftTarget: 'main > div.banner',
        largestShiftValue: 0.021347,
      });
    });

    it('keeps CLS values of 0 fractional', () => {
      const [doc] = client
        .webVital({ name: 'cls', value: 0, id: 'v5-1-2', navigationType: 'navigate' })
        .serialize();

      expect(JSON.stringify(doc.attributes)).toMatch(/"browser\.web_vital\.value":0\.\d+/);
      expect(doc.attributes?.['browser.web_vital.rating']).toBe('good');
    });

    it('writes clicks with a named mouse button and data-otel element attributes', () => {
      const [withAttributes] = client
        .click({
          pageX: 120,
          pageY: 480,
          tagName: 'BUTTON',
          cssSelector: '#add-to-cart',
          otelAttributes: { action: 'add-to-cart' },
        })
        .serialize();
      const [withoutAttributes] = client
        .click({ pageX: 1, pageY: 2, tagName: 'A', cssSelector: 'nav > a', button: 'middle' })
        .serialize();

      expect(withAttributes.event_name).toBe('browser.user_action.click');
      expect(withAttributes.attributes).toEqual({
        'browser.page.x': 120,
        'browser.page.y': 480,
        'browser.tag_name': 'BUTTON',
        'browser.css_selector': '#add-to-cart',
        'browser.mouse_event.button': 'left',
        'browser.element.attributes': { action: 'add-to-cart' },
      });
      expect(withoutAttributes.attributes).toMatchObject({
        'browser.mouse_event.button': 'middle',
        'browser.element.attributes': {},
      });
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
        .httpRequest({
          method: 'GET',
          url: 'https://api.example.com/products?page=2',
          statusCode: 200,
        })
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
      expect(doc.attributes).not.toHaveProperty(['error.type']);
      expect(doc.attributes).not.toHaveProperty(['event.outcome']);
    });

    it('sets the instrumentation version on the scope of logs and spans', () => {
      const [log] = client
        .navigation({ url: 'https://shop.example.com/', sameDocument: false })
        .serialize();
      const [span] = client
        .httpRequest({ method: 'GET', url: 'https://api.example.com/products', statusCode: 200 })
        .serialize();

      expect(log.scope).toEqual({
        name: '@opentelemetry/browser-instrumentation/navigation',
        version: '0.8.2',
      });
      expect(span.scope).toEqual({
        name: '@opentelemetry/browser-instrumentation/fetch',
        version: '0.8.2',
      });
    });

    it('omits the deployment environment of apps without one', () => {
      const [doc] = edotBrowser
        .app({ serviceName: 'docs-web' })
        .client(BROWSER_PROFILES.chromeMacos)
        .navigation({ url: 'https://docs.example.com/', sameDocument: false })
        .timestamp(TIMESTAMP)
        .serialize();

      expect(doc.resource?.attributes).toMatchObject({ 'service.name': 'docs-web' });
      expect(doc.resource?.attributes).not.toHaveProperty(['deployment.environment.name']);
    });

    it('only writes the request body size when it is given', () => {
      const url = 'https://api.example.com/cart';
      const [withBody] = client
        .httpRequest({ method: 'POST', url, statusCode: 201, requestBodySize: 512 })
        .serialize();
      const [withoutBody] = client.httpRequest({ method: 'GET', url, statusCode: 200 }).serialize();

      expect(withBody.attributes['http.request.body.size']).toBe(512);
      expect(withoutBody.attributes).not.toHaveProperty(['http.request.body.size']);
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
      expect(networkError.attributes).not.toHaveProperty(['http.response.status_code']);
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

    it('stamps session.start with the session, previous session and tab ids', () => {
      const [start] = edotBrowser
        .app({ serviceName: 'storefront-web', environment: 'production', distroVersion: '0.4.0' })
        .client(BROWSER_PROFILES.chromeMacos, {
          sessionId: 's-2',
          previousSessionId: 's-1',
          tabId: 'tab-1',
        })
        .sessionStart()
        .timestamp(TIMESTAMP)
        .serialize();

      expect(start).toMatchObject({
        event_name: 'session.start',
        scope: { name: '@elastic/opentelemetry-browser', version: '0.4.0' },
        attributes: {
          'session.id': 's-2',
          'session.previous_id': 's-1',
          'browser.tab.id': 'tab-1',
        },
      });
    });

    it('stamps the tab id and previous session id like EDOT Browser', () => {
      const app = edotBrowser.app({ serviceName: 'storefront-web', environment: 'production' });
      const stamp = (options: Parameters<typeof app.client>[1]) => {
        const tabClient = app.client(BROWSER_PROFILES.chromeMacos, options);
        const [log] = tabClient
          .exception({ type: 'Error', message: 'boom', stacktrace: '' })
          .serialize();
        const [span] = tabClient
          .httpRequest({ method: 'GET', url: 'https://api.example.com/', statusCode: 200 })
          .serialize();
        return [log.attributes, span.attributes];
      };

      stamp({ sessionId: 's-2', previousSessionId: 's-1', tabId: 'tab-1' }).forEach((attributes) =>
        expect(attributes).toMatchObject({
          'session.id': 's-2',
          'session.previous_id': 's-1',
          'browser.tab.id': 'tab-1',
        })
      );
      // The tab outlives an expired session
      stamp({ tabId: 'tab-1' }).forEach((attributes) => {
        expect(attributes).toMatchObject({ 'browser.tab.id': 'tab-1' });
        expect(attributes).not.toHaveProperty(['session.id']);
        expect(attributes).not.toHaveProperty(['session.previous_id']);
      });
      // A previous session ID only makes sense next to a session ID
      stamp({ previousSessionId: 's-1' }).forEach((attributes) =>
        expect(attributes).not.toHaveProperty(['session.previous_id'])
      );
    });
  });

  describe('planDocuments', () => {
    const DWELL = { median: 10_000, sigma: 1 };
    const plan = (
      seed: number,
      pageViews: number,
      {
        hardNavigationRate = 0.2,
        health = HEALTH_PROFILES.healthy,
      }: { hardNavigationRate?: number; health?: HealthProfile } = {}
    ) =>
      planDocuments(
        { client: createClient(), site: SITE, health, random: seededRandom(seed), slowdown: 1 },
        { pageViews, dwell: DWELL, hardNavigationRate }
      );

    it('plans back-to-back page views from 0, starting with a full load', () => {
      for (let seed = 1; seed <= 30; seed++) {
        const documents = plan(seed, 5);
        const pageViews = documents.flatMap((document) => document.pageViews);

        expect(documents[0].navigationType).toBe('navigate');
        expect(pageViews).toHaveLength(5);
        expect(pageViews[0].start).toBe(0);
        pageViews.forEach(({ start, from, end }, index) => {
          expect(start).toBeLessThanOrEqual(from);
          expect(end - from).toBeGreaterThanOrEqual(500);
          if (index > 0) {
            expect(start).toBe(pageViews[index - 1].end + 1);
          }
        });
      }
    });

    it('lets the user start on a loaded page once it has loaded, however long that takes', () => {
      for (let seed = 1; seed <= 30; seed++) {
        plan(seed, 5, { health: HEALTH_PROFILES.critical }).forEach(({ load, pageViews }) => {
          const [{ start, from }, ...routeChanges] = pageViews;
          expect(from).toBe(start + Math.floor(load.loadEventEnd));
          routeChanges.forEach((view) => expect(view.from).toBe(view.start));
        });
      }
    });

    it('varies how long the user stays on a page', () => {
      const dwellTimes = Array.from({ length: 50 }, (_, seed) => plan(seed, 5))
        .flat()
        .flatMap(({ pageViews }) => pageViews.map(({ from, end }) => end - from));

      // Bounces and long reads, like a log-normal distribution with a median of 10s
      expect(Math.min(...dwellTimes)).toBeLessThan(2_000);
      expect(Math.max(...dwellTimes)).toBeGreaterThan(60_000);
    });

    it('hides each document right before the next one loads, and the last at the session end', () => {
      for (let seed = 1; seed <= 30; seed++) {
        const documents = plan(seed, 5);
        const { pageViews } = documents[documents.length - 1];
        const lastView = pageViews[pageViews.length - 1];

        documents.forEach(({ hiddenAt }, index) => {
          const next = documents[index + 1];
          expect(hiddenAt).toBe(next ? next.pageViews[0].start - 1 : lastView.end);
        });
      }
    });

    it('turns page views into route changes or full loads by hardNavigationRate', () => {
      expect(plan(1, 5, { hardNavigationRate: 0 })).toHaveLength(1);
      expect(plan(1, 5, { hardNavigationRate: 1 })).toHaveLength(5);
    });
  });

  describe('session', () => {
    const createSession = ({
      seed = 1,
      pageViews = 4,
      health = HEALTH_PROFILES.healthy,
      sessionId,
      site = SITE,
      dwell,
      end,
    }: {
      seed?: number;
      pageViews?: number;
      health?: HealthProfile;
      sessionId?: string;
      site?: EdotBrowserSite;
      dwell?: Distribution;
      /** Anchors the session to end here instead of starting at `TIMESTAMP`. */
      end?: number;
    } = {}) =>
      edotBrowser
        .session({
          ...(end !== undefined ? { end } : { start: TIMESTAMP }),
          client: createClient(sessionId),
          site,
          health,
          pageViews,
          dwell,
          random: seededRandom(seed),
        })
        .flatMap((event) => event.serialize());
    const timestamps = (docs: ReturnType<typeof createSession>) =>
      docs.map((doc) => Number(doc['@timestamp']));

    const eventNames = (docs: ReturnType<typeof createSession>) =>
      docs.map((doc) => ('event_name' in doc ? doc.event_name : undefined));

    it('rejects a site without pages with a descriptive error', () => {
      expect(() => createSession({ site: { ...SITE, pages: [] } })).toThrow(
        'Site https://shop.example.com must have at least one page to simulate a session'
      );
    });

    it('starts with a full page load', () => {
      const docs = createSession({ pageViews: 1 });
      const names = eventNames(docs);
      const vitals = docs
        .filter((doc) => 'event_name' in doc && doc.event_name === 'browser.web_vital')
        .map((doc) => doc.attributes?.['browser.web_vital.name']);
      const resourceCount = docs.filter(
        (doc) =>
          'event_name' in doc &&
          doc.event_name === 'browser.resource_timing' &&
          !['fetch', 'xmlhttprequest'].includes(
            String(doc.attributes?.['browser.resource_timing.initiator_type'])
          )
      ).length;

      const [navigationTiming] = docs.filter(
        (doc) => 'event_name' in doc && doc.event_name === 'browser.navigation_timing'
      );
      const timing = (name: string) => Number(navigationTiming.attributes?.[name]);
      const pageLoadResources = docs.filter(
        (doc) =>
          'event_name' in doc &&
          doc.event_name === 'browser.resource_timing' &&
          doc.attributes?.['browser.resource_timing.initiator_type'] !== 'fetch'
      );

      expect(docs[0]).toMatchObject({
        event_name: 'browser.navigation',
        attributes: { 'url.full': expect.stringMatching(/^https:\/\/shop\.example\.com\//) },
      });
      expect(names.filter((name) => name === 'browser.navigation_timing')).toHaveLength(1);
      // Reported on DOMContentLoaded, and resources once the page has loaded
      expect(
        Math.abs(
          Number(docs[0]['@timestamp']) -
            (TIMESTAMP + timing('browser.navigation_timing.dom_content_loaded_event_start'))
        )
      ).toBeLessThan(1.1);
      pageLoadResources.forEach((doc) => {
        expect(doc['@timestamp']).toBeGreaterThan(
          TIMESTAMP + timing('browser.navigation_timing.load_event_end')
        );
      });
      expect(resourceCount).toBeGreaterThanOrEqual(3);
      expect(resourceCount).toBeLessThanOrEqual(8);
      expect(vitals).toEqual(expect.arrayContaining(['ttfb', 'fcp', 'lcp', 'cls']));
    });

    it('starts sessions at start or ends them at end', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const fromStart = timestamps(createSession({ seed }));
        const toEnd = timestamps(createSession({ seed, end: TIMESTAMP }));

        expect(Math.min(...fromStart)).toBeGreaterThanOrEqual(TIMESTAMP);
        expect(Math.max(...toEnd)).toBeLessThanOrEqual(TIMESTAMP);
        // The same session, moved in time
        const offset = fromStart[0] - toEnd[0];
        fromStart.forEach((timestamp, index) => expect(timestamp - toEnd[index]).toBe(offset));
      }
    });

    it('ends requests within the session even when they start at the end of a page view', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const docs = createSession({
          seed,
          end: TIMESTAMP,
          pageViews: 3,
          dwell: { median: 500, sigma: 0 },
          health: HEALTH_PROFILES.critical,
        });

        docs.forEach((doc) => {
          const durationMs = isSpan(doc) ? Number(doc.duration) / 1_000_000 : 0;
          expect(Number(doc['@timestamp']) + durationMs).toBeLessThanOrEqual(TIMESTAMP);
        });
      }
    });

    it('emits soft navigations without navigation timing', () => {
      const docs = Array.from({ length: 20 }, (_, seed) =>
        createSession({ seed, pageViews: 5 })
      ).flat();
      const navigations = docs.filter(
        (doc) => 'event_name' in doc && doc.event_name === 'browser.navigation'
      );
      const softNavigations = navigations.filter(
        (doc) => doc.attributes?.['browser.navigation.same_document'] === true
      );
      const hardNavigations = navigations.length - softNavigations.length;

      expect(softNavigations.length).toBeGreaterThan(0);
      softNavigations.forEach((doc) => {
        expect(doc.attributes?.['browser.navigation.type']).toBe('push');
      });
      expect(eventNames(docs).filter((name) => name === 'browser.navigation_timing')).toHaveLength(
        hardNavigations
      );
    });

    it('emits every EDOT Browser signal across sessions', () => {
      const docs = Array.from({ length: 30 }, (_, seed) =>
        createSession({ seed, health: HEALTH_PROFILES.erroring })
      ).flat();
      const names = new Set(eventNames(docs));
      const spans = docs.filter((doc) => !('event_name' in doc));
      const vitals = new Set(
        docs
          .filter((doc) => 'event_name' in doc && doc.event_name === 'browser.web_vital')
          .map((doc) => doc.attributes?.['browser.web_vital.name'])
      );

      expect([...names]).toEqual(
        expect.arrayContaining([
          'browser.navigation',
          'browser.navigation_timing',
          'browser.resource_timing',
          'browser.web_vital',
          'browser.user_action.click',
          'exception',
        ])
      );
      expect([...vitals].sort()).toEqual(['cls', 'fcp', 'inp', 'lcp', 'ttfb']);
      expect(spans.length).toBeGreaterThan(0);
      expect(spans.map((span) => span._index)).toEqual(
        spans.map(() => 'traces-generic.otel-default')
      );
    });

    it('only reports INP for documents with interactions', () => {
      for (let seed = 1; seed <= 30; seed++) {
        const docs = createSession({ seed, pageViews: 1 });
        const names = eventNames(docs);
        const hasClicks = names.includes('browser.user_action.click');
        const vitals = docs
          .filter((doc) => 'event_name' in doc && doc.event_name === 'browser.web_vital')
          .map((doc) => doc.attributes?.['browser.web_vital.name']);

        expect(vitals.includes('inp')).toBe(hasClicks);
      }
    });

    it('links fetch and XHR resource timing entries to their span', () => {
      const docs = Array.from({ length: 10 }, (_, seed) => createSession({ seed })).flat();
      let pairs = 0;

      docs.forEach((doc, index) => {
        if (!isSpan(doc) || doc.attributes['http.response.status_code'] === undefined) {
          return;
        }
        pairs++;
        expect(docs[index + 1]).toMatchObject({
          event_name: 'browser.resource_timing',
          trace_id: doc.trace_id,
          span_id: doc.span_id,
        });
      });
      expect(pairs).toBeGreaterThan(10);
      docs
        .filter(
          (doc) =>
            'event_name' in doc &&
            doc.event_name === 'browser.resource_timing' &&
            !['fetch', 'xmlhttprequest'].includes(
              String(doc.attributes?.['browser.resource_timing.initiator_type'])
            )
        )
        .forEach((doc) => expect(doc).not.toHaveProperty('trace_id'));
    });

    it('reports the body size of fetch POST requests only', () => {
      const origin = 'https://shop.example.com';
      const site: EdotBrowserSite = {
        origin,
        pages: [
          {
            path: '/',
            requests: [
              { method: 'POST', url: '/api/sampled' },
              { method: 'POST', url: '/api/fixed', bodySizeBytes: 777 },
              { method: 'POST', url: '/api/xhr', instrumentation: 'xhr' },
              { method: 'GET', url: '/api/get' },
            ],
          },
        ],
      };
      const bodySizeByPath = Object.fromEntries(
        createSession({ site, pageViews: 1 })
          .filter(isSpan)
          .map(({ attributes }) => [
            String(attributes['url.full']).replace(origin, ''),
            attributes['http.request.body.size'],
          ])
      );

      expect(bodySizeByPath['/api/sampled']).toBeGreaterThanOrEqual(120);
      expect(bodySizeByPath['/api/sampled']).toBeLessThanOrEqual(2_000);
      expect(bodySizeByPath['/api/fixed']).toBe(777);
      expect(bodySizeByPath['/api/xhr']).toBeUndefined();
      expect(bodySizeByPath['/api/get']).toBeUndefined();
    });

    it('resolves request paths on the site origin', () => {
      const site: EdotBrowserSite = {
        origin: 'https://shop.example.com',
        pages: [{ path: '/', requests: [{ method: 'GET', url: '/api/cart' }] }],
      };
      const docs = createSession({ site, pageViews: 1 });
      const requestUrls = docs
        .filter(
          (doc) =>
            isSpan(doc) || doc.attributes?.['browser.resource_timing.initiator_type'] === 'fetch'
        )
        .map((doc) => doc.attributes?.['url.full']);

      expect(requestUrls.length).toBeGreaterThan(0);
      requestUrls.forEach((url) => expect(url).toBe('https://shop.example.com/api/cart'));
      expect(docs.filter(isSpan)[0]?.attributes['server.address']).toBe('shop.example.com');
    });

    it('types network errors like the fetch and XHR instrumentations', () => {
      const health = { ...HEALTH_PROFILES.healthy, networkErrorRate: 0.5 };
      const spans = Array.from({ length: 20 }, (_, seed) => createSession({ seed, health }))
        .flat()
        .filter(isSpan)
        .filter(({ attributes }) => attributes['http.response.status_code'] === undefined);
      const errorTypes = (instrumentation: string) =>
        new Set(
          spans
            .filter(({ scope }) => scope.name.endsWith(`/${instrumentation}`))
            .map(({ attributes }) => attributes['error.type'])
        );

      expect([...errorTypes('fetch')]).toEqual(['TypeError']);
      expect([...errorTypes('xhr')]).toEqual(['Error']);
    });

    it('timestamps web vitals like the instrumentation', () => {
      for (let seed = 1; seed <= 30; seed++) {
        const docs = createSession({ seed, pageViews: 1, health: HEALTH_PROFILES.critical });
        const vital = (name: string) =>
          docs.find(
            (doc) =>
              'event_name' in doc &&
              doc.event_name === 'browser.web_vital' &&
              doc.attributes?.['browser.web_vital.name'] === name
          );
        const vitalValue = (name: string) =>
          Number(vital(name)?.attributes?.['browser.web_vital.value']);
        const clickTimes = docs
          .filter((doc) => 'event_name' in doc && doc.event_name === 'browser.user_action.click')
          .map((doc) => doc['@timestamp']);

        // FCP, LCP and TTFB at their value, relative to the navigation start. Timestamps are whole
        // milliseconds and values are rounded to 0.1ms.
        ['ttfb', 'fcp', 'lcp'].forEach((name) => {
          expect(
            Math.abs(Number(vital(name)?.['@timestamp']) - (TIMESTAMP + vitalValue(name)))
          ).toBeLessThan(1.1);
        });
        // CLS at the largest shift, or when the page is hidden at the session end if nothing shifted
        const sessionEnd = Math.max(...timestamps(docs));
        if (vitalValue('cls') < 0.0001) {
          expect(vital('cls')?.['@timestamp']).toBe(sessionEnd);
        } else {
          expect(vital('cls')?.['@timestamp']).toBeLessThan(sessionEnd);
        }
        // INP at one of the clicks
        if (clickTimes.length) {
          expect(clickTimes).toContain(vital('inp')?.['@timestamp']);
        }
      }
    });

    it('writes timings as 0 for phases that did not happen, and with a fractional part otherwise', () => {
      const docs = Array.from({ length: 10 }, (_, seed) => createSession({ seed })).flat();
      const timings = docs.flatMap(({ attributes = {} }) =>
        Object.entries(attributes).filter(([key]) =>
          /^browser\.(resource_timing\.(duration|.+_(start|end))|navigation_timing\.(dom_.+|.+_(start|end))|web_vital\.(value|delta))$/.test(
            key
          )
        )
      );

      expect(timings.length).toBeGreaterThan(100);
      // Reused connections skip the TLS handshake
      expect(timings).toContainEqual(['browser.resource_timing.secure_connection_start', 0]);
      timings.forEach(([, value]) => {
        expect(value === 0 || hasFractionalPart(Number(value))).toBe(true);
      });
    });

    it('writes resource timing phases in order', () => {
      const phases = [
        'fetch_start',
        'domain_lookup_start',
        'domain_lookup_end',
        'connect_start',
        'connect_end',
        'request_start',
        'response_start',
        'response_end',
      ];
      // Third-party resources open a new connection, so DNS and connect time count towards them
      const site: EdotBrowserSite = {
        ...SITE,
        resources: [
          ...(SITE.resources ?? []),
          { path: 'https://cdn.example.net/widget.js', initiatorType: 'script', sizeBytes: 9_000 },
        ],
      };
      const docs = Array.from({ length: 30 }, (_, seed) => createSession({ seed, site })).flat();
      const resourceDocs = docs.filter(
        (doc) => 'event_name' in doc && doc.event_name === 'browser.resource_timing'
      );

      expect(resourceDocs.length).toBeGreaterThan(100);
      resourceDocs.forEach(({ attributes = {} }) => {
        const timing = (name: string) => Number(attributes[`browser.resource_timing.${name}`]);
        const values = phases.map(timing);
        values.slice(1).forEach((value, index) => {
          expect(value).toBeGreaterThanOrEqual(values[index]);
        });
        expect(timing('response_end') - timing('fetch_start')).toBeCloseTo(timing('duration'), 0);
        if (timing('secure_connection_start') > 0) {
          expect(timing('secure_connection_start')).toBeGreaterThanOrEqual(timing('connect_start'));
          expect(timing('secure_connection_start')).toBeLessThanOrEqual(timing('connect_end'));
        }
      });
    });

    it('gives fetch spans the duration of their resource timing entry', () => {
      // Short page views with slow requests, so request durations get capped to the page view
      const docs = Array.from({ length: 30 }, (_, seed) =>
        createSession({
          seed,
          pageViews: 5,
          dwell: { median: 300, sigma: 0.5 },
          health: HEALTH_PROFILES.critical,
        })
      ).flat();
      let pairs = 0;

      docs.forEach((doc, index) => {
        if (!isSpan(doc) || doc.attributes['http.response.status_code'] === undefined) {
          return;
        }
        const durationMs = Number(doc.duration) / 1_000_000;
        const { attributes = {}, '@timestamp': timestamp } = docs[index + 1];
        pairs++;
        expect(attributes['url.full']).toBe(doc.attributes['url.full']);
        expect(Number(attributes['browser.resource_timing.duration'])).toBeCloseTo(durationMs, 0);
        expect(timestamp).toBe(Math.floor(Number(doc['@timestamp']) + durationMs));
      });
      expect(pairs).toBeGreaterThan(50);
    });

    it('gives the navigation timing the duration of the whole page load', () => {
      const [doc] = createSession({ pageViews: 1 }).filter(
        (event) => 'event_name' in event && event.event_name === 'browser.navigation_timing'
      );

      expect(Number(doc.attributes?.['browser.resource_timing.duration'])).toBeCloseTo(
        Number(doc.attributes?.['browser.navigation_timing.load_event_end']),
        0
      );
    });

    it('starts a session with a session.start log at the start of the session', () => {
      const docs = createSession({ sessionId: 'abc' });
      const starts = docs.filter(
        (doc) => 'event_name' in doc && doc.event_name === 'session.start'
      );

      expect(starts).toHaveLength(1);
      expect(starts[0]).toMatchObject({
        '@timestamp': TIMESTAMP,
        scope: { name: '@elastic/opentelemetry-browser', version: '0.3.0' },
        attributes: { 'session.id': 'abc' },
      });
      expect(docs[0]).toBe(starts[0]);
      expect(Math.min(...timestamps(docs))).toBe(TIMESTAMP);
    });

    it('does not start a session again when the user comes back to it', () => {
      const docs = edotBrowser
        .session({
          start: TIMESTAMP,
          client: createClient('abc'),
          site: SITE,
          health: HEALTH_PROFILES.healthy,
          pageViews: 2,
          resumed: true,
          random: seededRandom(1),
        })
        .flatMap((event) => event.serialize());

      expect(eventNames(docs)).not.toContain('session.start');
      docs.forEach((doc) => expect(doc.attributes?.['session.id']).toBe('abc'));
    });

    describe('idle tab', () => {
      const tabClient = edotBrowser
        .app({ serviceName: 'storefront-web', environment: 'production' })
        .client(BROWSER_PROFILES.chromeMacos, { tabId: 'tab-1' });
      const idleTab = (site: EdotBrowserSite = SITE) =>
        edotBrowser
          .idleTab({
            client: tabClient,
            site,
            health: HEALTH_PROFILES.healthy,
            start: TIMESTAMP,
            requestCount: 3,
            intervalMs: 60_000,
            random: seededRandom(1),
          })
          .flatMap((event) => event.serialize());

      it('sends background GET requests with the tab id and no session id', () => {
        const docs = idleTab();
        const spans = docs.filter(isSpan);

        expect(spans).toHaveLength(3);
        docs.forEach((doc) => {
          expect(doc.attributes?.['browser.tab.id']).toBe('tab-1');
          expect(doc.attributes).not.toHaveProperty(['session.id']);
        });
        spans.forEach((span, i) => {
          expect(span.attributes['http.request.method']).toBe('GET');
          expect(Number(span['@timestamp'])).toBe(TIMESTAMP + i * 60_000);
        });
      });

      it('sends nothing for a site without GET requests', () => {
        expect(idleTab({ ...SITE, pages: [{ path: '/' }] })).toEqual([]);
      });
    });

    it('does not emit session.start without a session id', () => {
      expect(eventNames(createSession())).not.toContain('session.start');
    });

    it('stamps the same session.id on all logs and spans of a session', () => {
      const docs = createSession({ sessionId: 'abc', health: HEALTH_PROFILES.critical });

      expect(docs.some((doc) => !('event_name' in doc))).toBe(true);
      docs.forEach((doc) => {
        expect(doc.attributes?.['session.id']).toBe('abc');
      });
    });

    it('produces more failures and exceptions for unhealthy apps', () => {
      const countErrors = (health: (typeof HEALTH_PROFILES)[keyof typeof HEALTH_PROFILES]) => {
        const docs = Array.from({ length: 100 }, (_, seed) =>
          createSession({ seed, health })
        ).flat();
        return {
          failedRequests: docs.filter((doc) => 'status' in doc && doc.status.code === 'Error')
            .length,
          exceptions: eventNames(docs).filter((name) => name === 'exception').length,
        };
      };
      const healthy = countErrors(HEALTH_PROFILES.healthy);
      const erroring = countErrors(HEALTH_PROFILES.erroring);

      expect(erroring.failedRequests).toBeGreaterThan(healthy.failedRequests * 3);
      expect(erroring.exceptions).toBeGreaterThan(healthy.exceptions * 3);
    });
  });
});
