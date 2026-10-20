/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OtelLogDocument } from '../otel_logs';
import type { Serializable } from '../serializable';
import type {
  EdotBrowserClient,
  HttpInstrumentation,
  NavigationTimingType,
} from './edot_browser_client';
import type { EdotBrowserSpanDocument } from './edot_browser_span';
import { sample, type HealthProfile } from './health_profiles';
import { between, pick } from './random';
import { resourceTimings } from './resource_timings';

export interface EdotBrowserResource {
  /** Path on the site origin, or an absolute URL for third-party resources. */
  path: string;
  initiatorType: 'script' | 'link' | 'img' | 'css' | 'other';
  sizeBytes: number;
  renderBlocking?: boolean;
  /** Multiplies the health profile's resource duration, e.g. for large images. */
  durationFactor?: number;
}

export interface EdotBrowserRequest {
  method: string;
  url: string;
  instrumentation?: HttpInstrumentation;
  /** Overrides the health profile's failure rate for this endpoint. */
  failureRate?: number;
  /** Status codes to pick from when the request fails. */
  failureStatusCodes?: readonly number[];
  /** Multiplies the health profile's HTTP latency. */
  latencyFactor?: number;
}

export interface EdotBrowserClickTarget {
  tagName: string;
  cssSelector: string;
  elementAttributes?: Record<string, string>;
  /** Request fired by clicking the element. */
  request?: EdotBrowserRequest;
}

export interface EdotBrowserExceptionTemplate {
  type: string;
  message: string;
}

export interface EdotBrowserPage {
  path: string;
  resources?: readonly EdotBrowserResource[];
  /** Requests fired when the page is shown. */
  requests?: readonly EdotBrowserRequest[];
  clickTargets?: readonly EdotBrowserClickTarget[];
}

export interface EdotBrowserSite {
  origin: string;
  pages: readonly EdotBrowserPage[];
  /** Resources loaded by every full page load. */
  resources?: readonly EdotBrowserResource[];
  /** Uncaught exceptions specific to this app, on top of common ones. */
  exceptions?: readonly EdotBrowserExceptionTemplate[];
}

export interface EdotBrowserSessionOptions {
  client: EdotBrowserClient;
  site: EdotBrowserSite;
  health: HealthProfile;
  start: number;
  pageViews: number;
  sessionDurationMs?: number;
  /** Probability that a page view after the first is a full document load, not an SPA route change. */
  hardNavigationRate?: number;
  random?: () => number;
}

export type EdotBrowserDocument = OtelLogDocument | EdotBrowserSpanDocument;
export type EdotBrowserEvent = Serializable<EdotBrowserDocument>;

const MIN_RESOURCES = 3;
const MAX_RESOURCES = 8;
const MOBILE_SLOWDOWN = 1.4;
const DEFAULT_FAILURE_STATUS_CODES = [500, 502, 503, 504] as const;
const RELOAD_RATE = 0.1;

const FILLER_RESOURCES: readonly EdotBrowserResource[] = [
  { path: '/static/js/vendor.4f1c2a.js', initiatorType: 'script', sizeBytes: 420_000 },
  { path: '/static/media/inter-latin.woff2', initiatorType: 'css', sizeBytes: 48_000 },
  { path: '/static/js/runtime.9b3e1d.js', initiatorType: 'script', sizeBytes: 6_000 },
  { path: '/favicon.ico', initiatorType: 'other', sizeBytes: 4_000 },
  { path: '/static/media/logo.svg', initiatorType: 'img', sizeBytes: 9_000 },
  { path: 'https://www.googletagmanager.com/gtag/js', initiatorType: 'script', sizeBytes: 140_000 },
];

const COMMON_EXCEPTIONS: readonly EdotBrowserExceptionTemplate[] = [
  { type: 'TypeError', message: "Cannot read properties of undefined (reading 'map')" },
  { type: 'TypeError', message: "Cannot read properties of null (reading 'addEventListener')" },
  { type: 'ReferenceError', message: 'gtag is not defined' },
  { type: 'ChunkLoadError', message: 'Loading chunk 742 failed.' },
];

const DEFAULT_CLICK_TARGETS: readonly EdotBrowserClickTarget[] = [
  { tagName: 'A', cssSelector: 'nav.main-nav > a:nth-child(2)' },
  {
    tagName: 'BUTTON',
    cssSelector: 'button.menu-toggle',
    elementAttributes: { 'aria-label': 'Menu' },
  },
  { tagName: 'INPUT', cssSelector: '#search', elementAttributes: { id: 'search', type: 'search' } },
  { tagName: 'DIV', cssSelector: 'div.card:nth-of-type(3)' },
];

interface SessionContext {
  client: EdotBrowserClient;
  site: EdotBrowserSite;
  health: HealthProfile;
  random: () => number;
  /** Mobile devices are slower at everything. */
  slowdown: number;
}

/** State of the document currently shown, which CLS and INP are reported for once it is hidden. */
interface DocumentState {
  /** Resource timings are relative to the time origin of the document. */
  timeOrigin: number;
  navigationType: string;
  interactions: number;
  clsValue: number;
  inpValue: number;
}

const isAbsoluteUrl = (path: string) => /^https?:\/\//.test(path);

const toUrl = ({ origin }: EdotBrowserSite, path: string) =>
  isAbsoluteUrl(path) ? path : `${origin}${path}`;

const vitalId = (random: () => number, time: number) =>
  `v5-${time}-${Math.floor(between(random, 1e12, 1e13 - 1))}`;

const stacktrace = (
  { site: { origin }, random }: SessionContext,
  { type, message }: EdotBrowserExceptionTemplate
) =>
  [
    `${type}: ${message}`,
    `    at render (${origin}/static/js/main.8c2d41.js:2:${Math.floor(
      between(random, 1000, 90000)
    )})`,
    `    at commitRoot (${origin}/static/js/vendor.4f1c2a.js:1:${Math.floor(
      between(random, 1000, 90000)
    )})`,
    `    at performWork (${origin}/static/js/vendor.4f1c2a.js:1:${Math.floor(
      between(random, 1000, 90000)
    )})`,
  ].join('\n');

/** CLS, and INP if the user interacted, which web-vitals reports when the document is hidden. */
const hideDocument = (
  { client, random }: SessionContext,
  { navigationType, interactions, clsValue, inpValue }: DocumentState,
  time: number
): EdotBrowserEvent[] => {
  const events: EdotBrowserEvent[] = [
    client
      .webVital({
        name: 'cls',
        value: clsValue,
        id: vitalId(random, time),
        navigationType,
        attribution: {
          largestShiftTarget: clsValue > 0 ? 'main > div.banner' : undefined,
          largestShiftValue: clsValue,
          loadState: 'complete',
        },
      })
      .timestamp(time),
  ];
  if (interactions > 0) {
    events.push(
      client
        .webVital({
          name: 'inp',
          value: inpValue,
          id: vitalId(random, time),
          navigationType,
          attribution: {
            interactionType: 'pointer',
            inputDelay: inpValue * 0.2,
            processingDuration: inpValue * 0.5,
            presentationDelay: inpValue * 0.3,
          },
        })
        .timestamp(time)
    );
  }
  return events;
};

/** A fetch/XHR span, its resource timing entry and, for some failures, an uncaught exception. */
const sendRequest = (
  ctx: SessionContext,
  { timeOrigin }: DocumentState,
  request: EdotBrowserRequest,
  time: number,
  latestEnd: number
): EdotBrowserEvent[] => {
  const { client, health, random, slowdown } = ctx;
  const {
    method,
    url,
    instrumentation = 'fetch',
    failureRate = health.httpFailureRate,
    failureStatusCodes = DEFAULT_FAILURE_STATUS_CODES,
    latencyFactor = 1,
  } = request;
  const duration = Math.min(
    sample(health.httpLatency, random) * latencyFactor * slowdown,
    Math.max(latestEnd - time, 1)
  );
  const isNetworkError = random() < health.networkErrorRate;
  const statusCode = isNetworkError
    ? undefined
    : random() < failureRate
    ? pick(random, failureStatusCodes)
    : method === 'POST'
    ? 201
    : 200;

  const events: EdotBrowserEvent[] = [
    client
      .httpRequest({
        method,
        url,
        statusCode,
        errorType: isNetworkError ? 'TypeError' : undefined,
        instrumentation,
      })
      .timestamp(time)
      .duration(duration),
  ];

  const endTime = Math.floor(time + duration);
  if (statusCode !== undefined) {
    // fetch/XHR requests also show up as resource timing entries
    events.push(
      client
        .resourceTiming({
          url,
          initiatorType: instrumentation === 'xhr' ? 'xmlhttprequest' : 'fetch',
          timings: resourceTimings(random, time - timeOrigin, duration, 2_000),
          nextHopProtocol: 'h2',
        })
        .timestamp(endTime)
    );
  }

  const isFailure = statusCode === undefined || statusCode >= 400;
  if (isFailure && random() < 0.5) {
    const exception = isNetworkError
      ? { type: 'TypeError', message: 'Failed to fetch' }
      : { type: 'Error', message: `Request failed with status code ${statusCode}` };
    events.push(
      client.exception({ ...exception, stacktrace: stacktrace(ctx, exception) }).timestamp(endTime)
    );
  }
  return events;
};

/** A full document load: navigation, sub-resources, navigation timing and load web vitals. */
const loadDocument = (
  ctx: SessionContext,
  page: EdotBrowserPage,
  pageStart: number,
  slotEnd: number,
  navigationType: NavigationTimingType
): { events: EdotBrowserEvent[]; document: DocumentState; loadedAt: number } => {
  const { client, site, health, random, slowdown } = ctx;
  const url = toUrl(site, page.path);
  const at = (offset: number) => Math.min(Math.floor(pageStart + offset), slotEnd);
  const vitalNavigationType = navigationType === 'back_forward' ? 'back-forward' : navigationType;

  const events: EdotBrowserEvent[] = [
    client.navigation({ url, sameDocument: false }).timestamp(pageStart),
  ];

  // Document request
  const fetchStart = between(random, 1, 5);
  const documentTimings = resourceTimings(random, fetchStart, 0, 30_000, { newConnection: true });
  const responseStart = Math.max(
    sample(health.ttfb, random) * slowdown,
    documentTimings.connectEnd + 1
  );
  const responseEnd = responseStart + between(random, 5, 40);
  const fcp = Math.max(
    sample(health.fcp, random) * slowdown,
    responseEnd + between(random, 30, 100)
  );
  const lcp = Math.max(sample(health.lcp, random) * slowdown, fcp);

  // Sub-resources: the site's and page's own, padded with common filler up to 3-8 entries
  const ownResources = [...(site.resources ?? []), ...(page.resources ?? [])];
  const resourceCount = Math.max(
    Math.min(ownResources.length, MAX_RESOURCES),
    Math.floor(between(random, MIN_RESOURCES, MAX_RESOURCES + 1))
  );
  const resources = [...ownResources, ...FILLER_RESOURCES].slice(0, resourceCount);
  let lastResourceEnd = responseEnd;
  resources.forEach(({ path, initiatorType, sizeBytes, renderBlocking, durationFactor = 1 }) => {
    const resourceStart = renderBlocking
      ? responseEnd + between(random, 1, 20)
      : responseEnd + between(random, 0, Math.max(lcp - responseEnd, 1) * 0.8);
    const duration = sample(health.resourceDuration, random) * durationFactor * slowdown;
    const cached = random() < 0.3;
    const timings = resourceTimings(random, resourceStart, duration, sizeBytes, {
      cached,
      newConnection: !cached && isAbsoluteUrl(path),
    });
    lastResourceEnd = Math.max(lastResourceEnd, timings.responseEnd);
    events.push(
      client
        .resourceTiming({
          url: toUrl(site, path),
          initiatorType,
          timings,
          nextHopProtocol: random() < 0.7 ? 'h2' : 'h3',
          renderBlockingStatus: renderBlocking ? 'blocking' : 'non-blocking',
        })
        .timestamp(at(timings.responseEnd))
    );
  });

  const domInteractive = responseEnd + (fcp - responseEnd) * 0.8;
  const domContentLoadedEventStart = domInteractive + between(random, 1, 10);
  const domContentLoadedEventEnd = domContentLoadedEventStart + between(random, 0.1, 15);
  const domComplete = Math.max(lastResourceEnd, lcp * 0.9, domContentLoadedEventEnd);
  const loadEventEnd = domComplete + between(random, 0.1, 5);

  events.push(
    client
      .navigationTiming({
        url,
        type: navigationType,
        timings: {
          domInteractive,
          domContentLoadedEventStart,
          domContentLoadedEventEnd,
          domComplete,
          loadEventStart: domComplete,
          loadEventEnd,
          unloadEventStart: 0,
          unloadEventEnd: 0,
          redirectCount: 0,
        },
        resourceTimings: {
          ...documentTimings,
          duration: responseEnd,
          requestStart: documentTimings.connectEnd + 0.5,
          responseStart,
          responseEnd,
        },
      })
      .timestamp(at(loadEventEnd)),
    client
      .webVital({
        name: 'ttfb',
        value: responseStart,
        id: vitalId(random, pageStart),
        navigationType: vitalNavigationType,
        attribution: {
          waitingDuration: fetchStart,
          dnsDuration: documentTimings.domainLookupEnd - documentTimings.domainLookupStart,
          connectionDuration: documentTimings.connectEnd - documentTimings.connectStart,
          requestDuration: responseStart - documentTimings.connectEnd,
        },
      })
      .timestamp(at(responseStart)),
    client
      .webVital({
        name: 'fcp',
        value: fcp,
        id: vitalId(random, pageStart),
        navigationType: vitalNavigationType,
        attribution: { timeToFirstByte: responseStart, firstByteToFCP: fcp - responseStart },
      })
      .timestamp(at(fcp)),
    client
      .webVital({
        name: 'lcp',
        value: lcp,
        id: vitalId(random, pageStart),
        navigationType: vitalNavigationType,
        attribution: {
          target: page.resources?.find(({ initiatorType }) => initiatorType === 'img')
            ? 'img.hero'
            : 'main h1',
          timeToFirstByte: responseStart,
          elementRenderDelay: lcp - fcp,
        },
      })
      .timestamp(at(loadEventEnd))
  );

  const clsValue = random() < health.clsZeroRate ? 0 : sample(health.cls, random);
  return {
    events,
    document: {
      timeOrigin: pageStart,
      navigationType: vitalNavigationType,
      interactions: 0,
      clsValue,
      inpValue: sample(health.inp, random) * slowdown,
    },
    loadedAt: at(loadEventEnd),
  };
};

/** What the user does on a page view: requests fired by the page, clicks and uncaught exceptions. */
const interactWithPage = (
  ctx: SessionContext,
  document: DocumentState,
  page: EdotBrowserPage,
  from: number,
  slotEnd: number
): { events: EdotBrowserEvent[]; interactions: number } => {
  const { client, site, health, random } = ctx;
  const events: EdotBrowserEvent[] = [];

  (page.requests ?? []).forEach((request) => {
    const time = Math.min(from + Math.floor(between(random, 5, 50)), slotEnd);
    events.push(...sendRequest(ctx, document, request, time, slotEnd));
  });

  const clickCount = Math.floor(between(random, 0, 4));
  const clickTargets = page.clickTargets?.length ? page.clickTargets : DEFAULT_CLICK_TARGETS;
  for (let c = 0; c < clickCount; c++) {
    const clickTime = Math.floor(between(random, from, slotEnd));
    const { request, ...target } = pick(random, clickTargets);
    events.push(
      client
        .click({
          ...target,
          pageX: between(random, 0, client.isMobile ? 390 : 1440),
          pageY: between(random, 0, 2400),
        })
        .timestamp(clickTime)
    );
    if (request) {
      const time = Math.min(clickTime + Math.floor(between(random, 1, 20)), slotEnd);
      events.push(...sendRequest(ctx, document, request, time, slotEnd));
    }
  }

  if (random() < health.jsErrorRate) {
    const exception = pick(random, [...COMMON_EXCEPTIONS, ...(site.exceptions ?? [])]);
    events.push(
      client
        .exception({ ...exception, stacktrace: stacktrace(ctx, exception) })
        .timestamp(Math.floor(between(random, from, slotEnd)))
    );
  }

  return { events, interactions: clickCount };
};

/** Builds a realistic EDOT Browser session: page loads, SPA navigations, interactions and requests. */
export const session = ({
  client,
  site,
  health,
  start,
  pageViews,
  sessionDurationMs = 60_000,
  hardNavigationRate = 0.2,
  random = Math.random,
}: EdotBrowserSessionOptions): EdotBrowserEvent[] => {
  const ctx: SessionContext = {
    client,
    site,
    health,
    random,
    slowdown: client.isMobile ? MOBILE_SLOWDOWN : 1,
  };
  const sessionEnd = start + sessionDurationMs;
  const slotDuration = sessionDurationMs / pageViews;
  const events: EdotBrowserEvent[] = [];
  let currentDocument: DocumentState | undefined;

  for (let i = 0; i < pageViews; i++) {
    const slotStart = start + i * slotDuration;
    const slotEnd = Math.floor(Math.min(slotStart + slotDuration, sessionEnd) - 1);
    const pageStart = Math.floor(
      i === 0 ? start : slotStart + between(random, 0, slotDuration * 0.1)
    );
    const page = pick(random, site.pages);

    let interactiveFrom = pageStart;
    if (!currentDocument || random() < hardNavigationRate) {
      if (currentDocument) {
        events.push(...hideDocument(ctx, currentDocument, pageStart - 1));
      }
      const isReload = currentDocument !== undefined && random() < RELOAD_RATE;
      const load = loadDocument(ctx, page, pageStart, slotEnd, isReload ? 'reload' : 'navigate');
      events.push(...load.events);
      currentDocument = load.document;
      interactiveFrom = load.loadedAt;
    } else {
      events.push(
        client
          .navigation({ url: toUrl(site, page.path), sameDocument: true, type: 'push' })
          .timestamp(pageStart)
      );
    }

    const interaction = interactWithPage(ctx, currentDocument, page, interactiveFrom, slotEnd);
    events.push(...interaction.events);
    currentDocument.interactions += interaction.interactions;
  }

  if (currentDocument) {
    events.push(...hideDocument(ctx, currentDocument, sessionEnd));
  }

  return events;
};
