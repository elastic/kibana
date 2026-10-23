/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateLongId, generateShortId } from '../utils/generate_id';
import { asFloat } from './as_float';
import { EdotBrowserLog } from './edot_browser_log';
import { EdotBrowserSpan } from './edot_browser_span';
import { getWebVitalRating, type WebVitalName } from './health_profiles';

const LOGS_INDEX = 'logs-generic.otel-default';
const TRACES_INDEX = 'traces-generic.otel-default';
const SCOPE_PREFIX = '@opentelemetry/browser-instrumentation';
// Version of the instrumentations, which EDOT Browser's `^0.8.0` range resolves to
const SCOPE_VERSION = '0.8.2';

const SEVERITY_INFO = 9;
const SEVERITY_ERROR = 17;

const HTTP_PORT_FROM_PROTOCOL: Readonly<Record<string, number>> = { 'http:': 80, 'https:': 443 };

export interface EdotBrowserClientOptions {
  /** Written as `attributes.session.id` on every log and span when set. */
  sessionId?: string;
  /** Written as `attributes.session.previous_id` when the session follows another one. Needs `sessionId`. */
  previousSessionId?: string;
  /**
   * Written as `attributes.browser.tab.id` on every log and span, one per browser tab. It is written
   * without `sessionId` too, like the telemetry of a tab whose session expired.
   */
  tabId?: string;
  /**
   * Writes the web-vitals attribution as a JSON string body on `browser.web_vital` events, like the
   * experimental `includeRawAttribution` option of the web-vitals instrumentation. Off by default.
   */
  includeRawAttribution?: boolean;
}

/**
 * Timings relative to the time origin, in milliseconds, plus byte sizes. A timing of 0 means the
 * phase didn't happen (e.g. `secureConnectionStart` on a reused connection).
 */
export interface ResourceTimingValues {
  duration: number;
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
}

export interface NavigationTimingValues {
  domInteractive: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  domComplete: number;
  loadEventStart: number;
  loadEventEnd: number;
  unloadEventStart: number;
  unloadEventEnd: number;
  redirectCount: number;
}

export type NavigationTimingType = 'navigate' | 'reload' | 'back_forward' | 'prerender';
export type SoftNavigationType = 'push' | 'replace' | 'traverse' | 'reload';
export type HttpInstrumentation = 'fetch' | 'xhr';
export type MouseButton = 'left' | 'middle' | 'right';

const INTEGER_TIMING_KEYS: ReadonlySet<string> = new Set([
  'transferSize',
  'encodedBodySize',
  'decodedBodySize',
  'redirectCount',
]);

const toSnakeCase = (key: string) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

const toTimingAttributes = (
  prefix: string,
  values: ResourceTimingValues | NavigationTimingValues
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => {
      const attributeKey = `${prefix}.${toSnakeCase(key)}`;
      if (INTEGER_TIMING_KEYS.has(key)) {
        return [[attributeKey, Math.round(value)]];
      }
      // Like the instrumentation, phases that didn't happen are written as a plain 0
      return [[attributeKey, value === 0 ? 0 : asFloat(value)]];
    })
  );

/** A single browser running an EDOT Browser-instrumented app; one builder per signal. */
export class EdotBrowserClient {
  constructor(
    private readonly resourceAttributes: Readonly<Record<string, unknown>>,
    private readonly options: EdotBrowserClientOptions = {}
  ) {}

  public get isMobile(): boolean {
    return this.resourceAttributes['browser.mobile'] === true;
  }

  /** Only Chromium-based browsers implement `navigator.userAgentData`, and with it brands. */
  private get isChromium(): boolean {
    return 'browser.brands' in this.resourceAttributes;
  }

  private get sessionAttributes(): Record<string, string> {
    const { sessionId, previousSessionId, tabId } = this.options;
    return {
      ...(sessionId ? { 'session.id': sessionId } : {}),
      ...(sessionId && previousSessionId ? { 'session.previous_id': previousSessionId } : {}),
      ...(tabId ? { 'browser.tab.id': tabId } : {}),
    };
  }

  private log(
    eventName: string,
    instrumentation: string,
    attributes: Record<string, unknown>,
    severityNumber: number = SEVERITY_INFO
  ): EdotBrowserLog {
    return new EdotBrowserLog({ _index: LOGS_INDEX })
      .eventName(eventName)
      .severity(severityNumber)
      .scope({ name: `${SCOPE_PREFIX}/${instrumentation}`, version: SCOPE_VERSION })
      .addResourceAttributes({ ...this.resourceAttributes })
      .addAttributes({ ...attributes, ...this.sessionAttributes });
  }

  navigation({
    url,
    sameDocument,
    hashChange = false,
    type,
  }: {
    url: string;
    sameDocument: boolean;
    hashChange?: boolean;
    /** Only set for soft (same-document) navigations. */
    type?: SoftNavigationType;
  }) {
    return this.log('browser.navigation', 'navigation', {
      'url.full': url,
      'browser.navigation.same_document': sameDocument,
      'browser.navigation.hash_change': hashChange,
      ...(type ? { 'browser.navigation.type': type } : {}),
    });
  }

  navigationTiming({
    url,
    type,
    timings,
    resourceTimings,
  }: {
    url: string;
    type: NavigationTimingType;
    timings: NavigationTimingValues;
    resourceTimings: ResourceTimingValues;
  }) {
    return this.log('browser.navigation_timing', 'navigation-timing', {
      'url.full': url,
      'browser.navigation_timing.type': type,
      ...toTimingAttributes('browser.navigation_timing', timings),
      ...toTimingAttributes('browser.resource_timing', resourceTimings),
    });
  }

  resourceTiming({
    url,
    initiatorType,
    timings,
    nextHopProtocol,
    renderBlockingStatus,
  }: {
    url: string;
    initiatorType: string;
    timings: ResourceTimingValues;
    nextHopProtocol?: string;
    renderBlockingStatus?: 'blocking' | 'non-blocking';
  }) {
    return this.log('browser.resource_timing', 'resource-timing', {
      'url.full': url,
      'browser.resource_timing.initiator_type': initiatorType,
      ...toTimingAttributes('browser.resource_timing', timings),
      // Redirects and service workers aren't simulated
      'browser.resource_timing.redirect_start': 0,
      'browser.resource_timing.redirect_end': 0,
      'browser.resource_timing.worker_start': 0,
      ...(nextHopProtocol ? { 'browser.resource_timing.next_hop_protocol': nextHopProtocol } : {}),
      // Only Chromium-based browsers report the render-blocking status
      ...(renderBlockingStatus && this.isChromium
        ? { 'browser.resource_timing.render_blocking_status': renderBlockingStatus }
        : {}),
    });
  }

  webVital({
    name,
    value,
    delta = value,
    id,
    navigationType,
    attribution,
  }: {
    name: WebVitalName;
    value: number;
    delta?: number;
    id: string;
    navigationType: string;
    attribution?: Record<string, unknown>;
  }) {
    // CLS is unitless and small, all other vitals are milliseconds
    const decimals = name === 'cls' ? 4 : 1;
    const log = this.log('browser.web_vital', 'web-vitals', {
      'browser.web_vital.name': name,
      'browser.web_vital.value': asFloat(value, decimals),
      'browser.web_vital.delta': asFloat(delta, decimals),
      'browser.web_vital.rating': getWebVitalRating(name, value),
      'browser.web_vital.id': id,
      'browser.web_vital.navigation_type': navigationType,
    });
    return attribution && this.options.includeRawAttribution
      ? log.message(JSON.stringify(attribution))
      : log;
  }

  click({
    pageX,
    pageY,
    tagName,
    cssSelector,
    button = 'left',
    otelAttributes = {},
  }: {
    pageX: number;
    pageY: number;
    tagName: string;
    cssSelector: string;
    button?: MouseButton;
    /** The element's `data-otel-*` attributes, without the prefix. */
    otelAttributes?: Record<string, string>;
  }) {
    return this.log('browser.user_action.click', 'user-action', {
      'browser.page.x': Math.round(pageX),
      'browser.page.y': Math.round(pageY),
      'browser.tag_name': tagName,
      'browser.element.attributes': otelAttributes,
      'browser.mouse_event.button': button,
      'browser.css_selector': cssSelector,
    });
  }

  exception({ type, message, stacktrace }: { type: string; message: string; stacktrace: string }) {
    return this.log(
      'exception',
      'errors',
      {
        'exception.type': type,
        'exception.message': message,
        'exception.stacktrace': stacktrace,
      },
      SEVERITY_ERROR
    );
  }

  /**
   * A fetch/XHR request. Omit `statusCode` and pass `errorType` for requests that never received
   * a response (network errors).
   */
  httpRequest({
    method,
    url,
    statusCode,
    errorType,
    requestBodySize,
    instrumentation = 'fetch',
    traceId = generateLongId(),
    spanId = generateShortId(),
  }: {
    method: string;
    url: string;
    statusCode?: number;
    errorType?: string;
    /** Size in bytes of a request body of known length, which fetch reports for e.g. JSON POSTs. */
    requestBodySize?: number;
    instrumentation?: HttpInstrumentation;
    traceId?: string;
    spanId?: string;
  }) {
    const parsedUrl = new URL(url);
    const serverPort = Number(parsedUrl.port) || HTTP_PORT_FROM_PROTOCOL[parsedUrl.protocol];
    const isError = statusCode === undefined || statusCode >= 400 || errorType !== undefined;
    const resolvedErrorType =
      errorType ?? (statusCode !== undefined ? String(statusCode) : undefined);

    return new EdotBrowserSpan({
      _index: TRACES_INDEX,
      trace_id: traceId,
      span_id: spanId,
      name: method,
      kind: 'Client',
      status: { code: isError ? 'Error' : 'Unset' },
      scope: { name: `${SCOPE_PREFIX}/${instrumentation}`, version: SCOPE_VERSION },
      resource: { attributes: { ...this.resourceAttributes } },
      attributes: {
        'http.request.method': method,
        'url.full': url,
        'server.address': parsedUrl.hostname,
        ...(serverPort ? { 'server.port': serverPort } : {}),
        ...(requestBodySize !== undefined ? { 'http.request.body.size': requestBodySize } : {}),
        ...(statusCode !== undefined ? { 'http.response.status_code': statusCode } : {}),
        ...(isError && resolvedErrorType ? { 'error.type': resolvedErrorType } : {}),
        ...this.sessionAttributes,
      },
    });
  }
}
