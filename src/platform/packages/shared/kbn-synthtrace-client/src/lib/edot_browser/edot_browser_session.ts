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
import { generateLongId, generateShortId } from '../utils/generate_id';
import type {
  EdotBrowserClient,
  HttpInstrumentation,
  NavigationTimingType,
  ResourceTimingValues,
} from './edot_browser_client';
import type { EdotBrowserSpanDocument } from './edot_browser_span';
import { sample, type Distribution, type HealthProfile } from './health_profiles';
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
  /** Path on the site origin, or an absolute URL for cross-origin requests. */
  url: string;
  instrumentation?: HttpInstrumentation;
  /** Overrides the health profile's failure rate for this endpoint. */
  failureRate?: number;
  /** Status codes to pick from when the request fails. */
  failureStatusCodes?: readonly number[];
  /** Multiplies the health profile's HTTP latency. */
  latencyFactor?: number;
  /** Size of the request body in bytes. Fetch only: XHR doesn't report it. Sampled for POSTs when unset. */
  bodySizeBytes?: number;
}

export interface EdotBrowserClickTarget {
  tagName: string;
  /** In the format of the user-action instrumentation: ids and `:nth-child`, no `:nth-of-type`. */
  cssSelector: string;
  /** The element's `data-otel-*` attributes, without the prefix. */
  otelAttributes?: Record<string, string>;
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

/** When the session takes place: from `start` on, or ending at `end`. */
type SessionAnchor = { start: number; end?: undefined } | { end: number; start?: undefined };

export type EdotBrowserSessionOptions = SessionAnchor & {
  client: EdotBrowserClient;
  site: EdotBrowserSite;
  health: HealthProfile;
  pageViews: number;
  /** How long the user stays on a page once it is usable, in milliseconds. */
  dwell?: Distribution;
  /** Probability that a page view after the first is a full document load, not an SPA route change. */
  hardNavigationRate?: number;
  random?: () => number;
};

export type EdotBrowserDocument = OtelLogDocument | EdotBrowserSpanDocument;
export type EdotBrowserEvent = Serializable<EdotBrowserDocument>;

const MIN_RESOURCES = 3;
const MAX_RESOURCES = 8;
const MOBILE_SLOWDOWN = 1.4;
const DEFAULT_FAILURE_STATUS_CODES = [500, 502, 503, 504] as const;
const RELOAD_RATE = 0.1;
// Many short bounces, most views in the tens of seconds and a long tail of minutes-long reads
const DEFAULT_DWELL: Distribution = { median: 10_000, sigma: 1 };
const MIN_DWELL_MS = 500;

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
  },
  { tagName: 'INPUT', cssSelector: '#search' },
  { tagName: 'DIV', cssSelector: '#main > div.card:nth-child(3)' },
];

/*
 * How a session is built
 *
 * A session is generated in two phases, planning and simulation.
 *
 * Planning (`planDocuments`) decides the session's structure and timing, without emitting anything:
 * - The session is a sequence of page views (`PageView`), back to back. Each page view shows one
 *   page of the site from `start` to `end`. The user interacts with it from `from` on, which is
 *   when the page is usable: right away for an SPA route change, or once a full page load is done.
 *   After that, the user stays on the page for a sampled dwell time.
 * - Page views are grouped into documents (`DocumentPlan`), the way a browser sees them. A
 *   document starts with a full page load, followed by any number of SPA route changes on the
 *   same document, and is hidden right before the next full page load or at the session end.
 * - Each document carries its `PageLoadPlan`: all timings of the page load, sampled up front.
 *   That makes the length of every page view, and so of the session, known before simulating.
 * - Plans start at time 0. `session()` then moves them to the requested `start`, or so that the
 *   session ends at `end`.
 *
 * Simulation (`simulateDocument`) turns each planned document into events, from load to hide:
 * - `loadDocument` emits the page load (navigation, resource and navigation timing, TTFB, FCP
 *   and LCP) from the load plan, and derives the `DocumentState` the later steps share.
 * - `interactWithPage` emits what the user does on each page view: requests fired by the page,
 *   clicks, the requests they fire, and uncaught exceptions. `routeChange` emits the soft
 *   navigation of each SPA route change.
 * - `hideDocument` emits CLS and INP, which web-vitals reports once the document is hidden.
 *
 * Planning and simulation draw from the same `random` source, planning first. A seed therefore
 * reproduces a session exactly, but any change to the order of draws changes seeded output.
 */

interface SessionContext {
  client: EdotBrowserClient;
  site: EdotBrowserSite;
  health: HealthProfile;
  random: () => number;
  /** Mobile devices are slower at everything. */
  slowdown: number;
}

/** One page shown during the session. Its events stay within `[start, end]`. */
interface PageView {
  page: EdotBrowserPage;
  start: number;
  /** When the page is usable and the user starts interacting with it. */
  from: number;
  end: number;
}

/** Timings of a full page load, in milliseconds relative to the navigation start. */
interface PageLoadPlan {
  fetchStart: number;
  documentTimings: ResourceTimingValues;
  responseStart: number;
  responseEnd: number;
  fcp: number;
  lcp: number;
  resources: Array<{
    resource: EdotBrowserResource;
    timings: ResourceTimingValues;
    nextHopProtocol: string;
  }>;
  domInteractive: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  domComplete: number;
  loadEventEnd: number;
  /** The resource timing instrumentation collects the entries after the load event, when idle. */
  resourcesReportedAt: number;
  clsValue: number;
  /** Unset when nothing shifted. */
  largestShiftTime?: number;
  inpValue: number;
}

/** A full page load and its SPA route changes, until the next full load or the session end. */
export interface DocumentPlan {
  navigationType: NavigationTimingType;
  load: PageLoadPlan;
  /** The first page view loads the document, the others are route changes. */
  pageViews: [PageView, ...PageView[]];
  hiddenAt: number;
}

/** A loaded document, and the CLS and INP values reported for it once it is hidden. */
interface DocumentState {
  /** Resource timings are relative to the time origin of the document. */
  timeOrigin: number;
  navigationType: string;
  clsValue: number;
  /** Time of the largest layout shift, unset when nothing shifted. */
  largestShiftTime?: number;
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

/**
 * CLS, and INP if the user interacted, which web-vitals reports when the document is hidden. Like
 * the instrumentation, they are timestamped with the largest shift and the interaction, if any.
 */
const hideDocument = (
  { client, random }: SessionContext,
  { timeOrigin, navigationType, clsValue, largestShiftTime, inpValue }: DocumentState,
  /** Times of the clicks on the document; INP is reported for one of them. */
  interactionTimes: number[],
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
          largestShiftTarget: largestShiftTime !== undefined ? 'main > div.banner' : undefined,
          largestShiftTime:
            largestShiftTime !== undefined ? largestShiftTime - timeOrigin : undefined,
          largestShiftValue: clsValue,
          loadState: 'complete',
        },
      })
      .timestamp(largestShiftTime ?? time),
  ];
  if (interactionTimes.length > 0) {
    const interactionTime = pick(random, interactionTimes);
    events.push(
      client
        .webVital({
          name: 'inp',
          value: inpValue,
          id: vitalId(random, time),
          navigationType,
          attribution: {
            interactionType: 'pointer',
            interactionTime: interactionTime - timeOrigin,
            inputDelay: inpValue * 0.2,
            processingDuration: inpValue * 0.5,
            presentationDelay: inpValue * 0.3,
          },
        })
        .timestamp(interactionTime)
    );
  }
  return events;
};

/**
 * A fetch/XHR span, its resource timing entry, which the instrumentation links to the span, and,
 * for some failures, an uncaught exception.
 */
const sendRequest = (
  ctx: SessionContext,
  { timeOrigin }: DocumentState,
  request: EdotBrowserRequest,
  requestedTime: number,
  latestEnd: number
): EdotBrowserEvent[] => {
  // The request, and with it its 1ms minimum duration, must end within the page view
  const time = Math.min(requestedTime, latestEnd - 1);
  const { client, site, health, random, slowdown } = ctx;
  const {
    method,
    instrumentation = 'fetch',
    failureRate = health.httpFailureRate,
    failureStatusCodes = DEFAULT_FAILURE_STATUS_CODES,
    latencyFactor = 1,
    bodySizeBytes,
  } = request;
  const url = toUrl(site, request.url);
  const duration = Math.min(
    sample(health.httpLatency, random) * latencyFactor * slowdown,
    latestEnd - time
  );
  const isNetworkError = random() < health.networkErrorRate;
  const statusCode = isNetworkError
    ? undefined
    : random() < failureRate
    ? pick(random, failureStatusCodes)
    : method === 'POST'
    ? 201
    : 200;
  const traceContext = { traceId: generateLongId(), spanId: generateShortId() };

  const events: EdotBrowserEvent[] = [
    client
      .httpRequest({
        method,
        url,
        statusCode,
        // A failed fetch rejects with a TypeError, a failed XHR fires an `error` event
        errorType: isNetworkError ? (instrumentation === 'xhr' ? 'Error' : 'TypeError') : undefined,
        // XHR doesn't report the size of the body it sends
        requestBodySize:
          instrumentation === 'fetch' && (bodySizeBytes !== undefined || method === 'POST')
            ? bodySizeBytes ?? Math.round(between(random, 120, 2_000))
            : undefined,
        instrumentation,
        ...traceContext,
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
        .traceContext(traceContext)
        .timestamp(endTime)
    );
  }

  // Unlike fetch, XHR doesn't throw on network errors
  const isFailure = statusCode === undefined ? instrumentation === 'fetch' : statusCode >= 400;
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

/** Samples the timings of a full page load. */
const planPageLoad = (
  { site, health, random, slowdown }: SessionContext,
  page: EdotBrowserPage
): PageLoadPlan => {
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
  const resources = [...ownResources, ...FILLER_RESOURCES]
    .slice(0, resourceCount)
    .map((resource) => {
      const { path, sizeBytes, renderBlocking, durationFactor = 1 } = resource;
      const resourceStart = renderBlocking
        ? responseEnd + between(random, 1, 20)
        : responseEnd + between(random, 0, Math.max(lcp - responseEnd, 1) * 0.8);
      const duration = sample(health.resourceDuration, random) * durationFactor * slowdown;
      const cached = random() < 0.3;
      const timings = resourceTimings(random, resourceStart, duration, sizeBytes, {
        cached,
        newConnection: !cached && isAbsoluteUrl(path),
      });
      return { resource, timings, nextHopProtocol: random() < 0.7 ? 'h2' : 'h3' };
    });
  const lastResourceEnd = Math.max(
    responseEnd,
    ...resources.map(({ timings }) => timings.responseEnd)
  );

  const domInteractive = responseEnd + (fcp - responseEnd) * 0.8;
  const domContentLoadedEventStart = domInteractive + between(random, 1, 10);
  const domContentLoadedEventEnd = domContentLoadedEventStart + between(random, 0.1, 15);
  const domComplete = Math.max(lastResourceEnd, lcp * 0.9, domContentLoadedEventEnd);
  const loadEventEnd = domComplete + between(random, 0.1, 5);
  const clsValue = random() < health.clsZeroRate ? 0 : sample(health.cls, random);

  return {
    fetchStart,
    documentTimings,
    responseStart,
    responseEnd,
    fcp,
    lcp,
    resources,
    domInteractive,
    domContentLoadedEventStart,
    domContentLoadedEventEnd,
    domComplete,
    loadEventEnd,
    resourcesReportedAt: loadEventEnd + between(random, 1, 50),
    clsValue,
    // Layout shifts happen while the page renders
    largestShiftTime: clsValue > 0 ? between(random, fcp, Math.max(lcp, loadEventEnd)) : undefined,
    inpValue: sample(health.inp, random) * slowdown,
  };
};

/** The events of a full page load: navigation, sub-resources, navigation timing and web vitals. */
const loadDocument = (
  { client, site, random }: SessionContext,
  { page, start: pageStart, end }: PageView,
  navigationType: NavigationTimingType,
  {
    fetchStart,
    documentTimings,
    responseStart,
    responseEnd,
    fcp,
    lcp,
    resources,
    domInteractive,
    domContentLoadedEventStart,
    domContentLoadedEventEnd,
    domComplete,
    loadEventEnd,
    resourcesReportedAt,
    clsValue,
    largestShiftTime,
    inpValue,
  }: PageLoadPlan
): { events: EdotBrowserEvent[]; document: DocumentState } => {
  const url = toUrl(site, page.path);
  const at = (offset: number) => Math.min(Math.floor(pageStart + offset), end);
  const vitalNavigationType = navigationType === 'back_forward' ? 'back-forward' : navigationType;

  const events: EdotBrowserEvent[] = [
    // The navigation instrumentation reports hard navigations on DOMContentLoaded
    client.navigation({ url, sameDocument: false }).timestamp(at(domContentLoadedEventStart)),
    ...resources.map(
      ({ resource: { path, initiatorType, renderBlocking }, timings, nextHopProtocol }) =>
        client
          .resourceTiming({
            url: toUrl(site, path),
            initiatorType,
            timings,
            nextHopProtocol,
            renderBlockingStatus: renderBlocking ? 'blocking' : 'non-blocking',
          })
          .timestamp(at(resourcesReportedAt))
    ),
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
          // The navigation entry lasts until the end of the load event
          duration: loadEventEnd,
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
      .timestamp(at(lcp)),
  ];

  return {
    events,
    document: {
      timeOrigin: pageStart,
      navigationType: vitalNavigationType,
      clsValue,
      largestShiftTime: largestShiftTime !== undefined ? at(largestShiftTime) : undefined,
      inpValue,
    },
  };
};

/** What the user does on a page view: requests fired by the page, clicks and uncaught exceptions. */
const interactWithPage = (
  ctx: SessionContext,
  document: DocumentState,
  { page, from, end: slotEnd }: PageView
): { events: EdotBrowserEvent[]; clickTimes: number[] } => {
  const { client, site, health, random } = ctx;
  const events: EdotBrowserEvent[] = [];
  const clickTimes: number[] = [];

  (page.requests ?? []).forEach((request) => {
    const time = Math.min(from + Math.floor(between(random, 5, 50)), slotEnd);
    events.push(...sendRequest(ctx, document, request, time, slotEnd));
  });

  const clickCount = Math.floor(between(random, 0, 4));
  const clickTargets = page.clickTargets?.length ? page.clickTargets : DEFAULT_CLICK_TARGETS;
  for (let c = 0; c < clickCount; c++) {
    const clickTime = Math.floor(between(random, from, slotEnd));
    const { request, ...target } = pick(random, clickTargets);
    clickTimes.push(clickTime);
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

  return { events, clickTimes };
};

/** An SPA route change, which the navigation instrumentation reports as a soft navigation. */
const routeChange = (
  { client, site }: SessionContext,
  { page, start }: PageView
): EdotBrowserEvent =>
  client
    .navigation({ url: toUrl(site, page.path), sameDocument: true, type: 'push' })
    .timestamp(start);

/**
 * Plans a session's page views, back to back from time 0, and groups them into documents: the
 * first page view and a share of the later ones are full page loads, the others are SPA route
 * changes. A page view lasts until the page is usable, then as long as the user stays on it.
 */
export const planDocuments = (
  ctx: SessionContext,
  {
    pageViews,
    dwell,
    hardNavigationRate,
  }: { pageViews: number; dwell: Distribution; hardNavigationRate: number }
): DocumentPlan[] => {
  const { site, random } = ctx;
  const documents: Array<Omit<DocumentPlan, 'hiddenAt'>> = [];
  let time = 0;
  const pageView = (page: EdotBrowserPage, from: number): PageView => {
    const view = {
      page,
      start: time,
      from,
      end: from + Math.max(Math.round(sample(dwell, random)), MIN_DWELL_MS),
    };
    time = view.end + 1;
    return view;
  };

  for (let i = 0; i < pageViews; i++) {
    const page = pick(random, site.pages);
    const current = documents[documents.length - 1];
    if (current && random() >= hardNavigationRate) {
      current.pageViews.push(pageView(page, time));
    } else {
      const navigationType = current && random() < RELOAD_RATE ? 'reload' : 'navigate';
      const load = planPageLoad(ctx, page);
      documents.push({
        navigationType,
        load,
        pageViews: [pageView(page, time + Math.floor(load.loadEventEnd))],
      });
    }
  }

  // A document is hidden right before the next one loads
  return documents.map((document, index) => ({
    ...document,
    hiddenAt: index + 1 < documents.length ? documents[index + 1].pageViews[0].start - 1 : time - 1,
  }));
};

const shiftPageView = (view: PageView, offset: number): PageView => ({
  ...view,
  start: view.start + offset,
  from: view.from + offset,
  end: view.end + offset,
});

/** Moves a planned document from time 0 to the session's actual time. */
const shiftDocument = (
  { pageViews: [first, ...rest], hiddenAt, ...document }: DocumentPlan,
  offset: number
): DocumentPlan => ({
  ...document,
  pageViews: [shiftPageView(first, offset), ...rest.map((view) => shiftPageView(view, offset))],
  hiddenAt: hiddenAt + offset,
});

/** Everything that happens to one document, from its load until it is hidden. */
const simulateDocument = (
  ctx: SessionContext,
  { navigationType, load, pageViews, hiddenAt }: DocumentPlan
): EdotBrowserEvent[] => {
  const [loadView, ...routeChanges] = pageViews;
  const { events, document } = loadDocument(ctx, loadView, navigationType, load);
  const visits = pageViews.map((view) => interactWithPage(ctx, document, view));

  return [
    ...events,
    ...routeChanges.map((view) => routeChange(ctx, view)),
    ...visits.flatMap((visit) => visit.events),
    ...hideDocument(
      ctx,
      document,
      visits.flatMap(({ clickTimes }) => clickTimes),
      hiddenAt
    ),
  ];
};

/** Builds a realistic EDOT Browser session: page loads, SPA navigations, interactions and requests. */
export const session = (options: EdotBrowserSessionOptions): EdotBrowserEvent[] => {
  const {
    client,
    site,
    health,
    pageViews,
    dwell = DEFAULT_DWELL,
    hardNavigationRate = 0.2,
    random = Math.random,
  } = options;
  if (site.pages.length === 0) {
    throw new Error(`Site ${site.origin} must have at least one page to simulate a session`);
  }
  const ctx: SessionContext = {
    client,
    site,
    health,
    random,
    slowdown: client.isMobile ? MOBILE_SLOWDOWN : 1,
  };
  const documents = planDocuments(ctx, { pageViews, dwell, hardNavigationRate });
  const duration = documents.length ? documents[documents.length - 1].hiddenAt : 0;
  const start = options.start !== undefined ? options.start : options.end - duration;

  return documents
    .map((document) => shiftDocument(document, start))
    .flatMap((document) => simulateDocument(ctx, document));
};
