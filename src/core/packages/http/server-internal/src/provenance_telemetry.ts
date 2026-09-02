/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  OnPostAuthHandler,
  KibanaRequest,
  RouteMethod,
  RouteAccess,
} from '@kbn/core-http-server';
import { isSafeMethod } from '@kbn/core-http-router-server-internal';

const ORIGIN_HEADER = 'origin';
const SEC_FETCH_SITE_HEADER = 'sec-fetch-site';
const SEC_FETCH_MODE_HEADER = 'sec-fetch-mode';
const USER_AGENT_HEADER = 'user-agent';

/** Counter type used to group all provenance dry-run measurements under the `core` usage domain. */
export const PROVENANCE_TELEMETRY_COUNTER_TYPE = 'xsrf_provenance';

const SEC_FETCH_SITE_BUCKETS = ['same-origin', 'same-site', 'cross-site', 'none'] as const;

type KnownSecFetchSiteBucket = (typeof SEC_FETCH_SITE_BUCKETS)[number];
export type SecFetchSiteBucket = KnownSecFetchSiteBucket | 'absent' | 'other';

const SEC_FETCH_MODE_BUCKETS = ['cors', 'navigate', 'no-cors', 'same-origin', 'websocket'] as const;

type KnownSecFetchModeBucket = (typeof SEC_FETCH_MODE_BUCKETS)[number];
export type SecFetchModeBucket = KnownSecFetchModeBucket | 'other' | 'absent';

// Security-approved heuristic: flags UAs that look like a modern browser
// engine without capturing the raw header value.
const LIKELY_MODERN_BROWSER =
  /^Mozilla\/5\.0 \([^)]{10,200}\) (?:AppleWebKit\/[\d.]+ \(KHTML, like Gecko\).*(?:Chrome|CriOS|Edg|EdgiOS|OPR|Version)\/\d|Gecko\/\S+ (?:Firefox|FxiOS)\/\d)/;

export const isLikelyModernBrowser = (userAgent: string | undefined): boolean => {
  if (!userAgent || userAgent.length > 512) {
    return false;
  }
  if (userAgent.includes('(compatible;')) {
    return false;
  }
  if (userAgent.includes('HeadlessChrome')) {
    return false;
  }
  return LIKELY_MODERN_BROWSER.test(userAgent);
};

export interface ProvenanceClassification {
  secFetchSiteBucket: SecFetchSiteBucket;
  secFetchModeBucket: SecFetchModeBucket;
  originPresent: boolean;
  isBrowserUa: boolean;
  method: RouteMethod;
  routeAccess: RouteAccess;
  gapBrowserMissingProvenance: boolean;
  wouldBlock: boolean;
}

/** Minimal view of the http config this handler needs; satisfied by both `HttpConfig` and `HttpConfigType`. */
interface ProvenanceTelemetryConfig {
  xsrf: {
    disableProtection: boolean;
    allowlist: string[];
  };
}

type IncrementCounter = (params: {
  counterName: string;
  counterType?: string;
  incrementBy?: number;
}) => void;

const firstHeaderValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const toSecFetchSiteBucket = (value: string | undefined): SecFetchSiteBucket => {
  if (value == null) {
    return 'absent';
  }
  return (SEC_FETCH_SITE_BUCKETS as readonly string[]).includes(value)
    ? (value as KnownSecFetchSiteBucket)
    : 'other';
};

const toSecFetchModeBucket = (value: string | undefined): SecFetchModeBucket => {
  if (value == null) {
    return 'absent';
  }
  return (SEC_FETCH_MODE_BUCKETS as readonly string[]).includes(value)
    ? (value as KnownSecFetchModeBucket)
    : 'other';
};

/**
 * Only enums/booleans leave this function, no raw header values, so no PII is recorded.
 */
export const classifyProvenance = (request: KibanaRequest): ProvenanceClassification => {
  const secFetchSite = firstHeaderValue(request.headers[SEC_FETCH_SITE_HEADER]);
  const secFetchMode = firstHeaderValue(request.headers[SEC_FETCH_MODE_HEADER]);
  const origin = firstHeaderValue(request.headers[ORIGIN_HEADER]);
  const userAgent = firstHeaderValue(request.headers[USER_AGENT_HEADER]);

  const secFetchSiteBucket = toSecFetchSiteBucket(secFetchSite);
  const secFetchModeBucket = toSecFetchModeBucket(secFetchMode);
  const originPresent = origin != null;
  const isBrowserUa = isLikelyModernBrowser(userAgent);

  return {
    secFetchSiteBucket,
    secFetchModeBucket,
    originPresent,
    isBrowserUa,
    method: request.route.method,
    routeAccess: request.route.options.access,
    gapBrowserMissingProvenance: isBrowserUa && secFetchSiteBucket === 'absent' && !originPresent,
    // Dry-run only, pending Security sign-off on enforcement: a cross-site
    // fetch would be rejected under the proposed model.
    wouldBlock: secFetchSiteBucket === 'cross-site',
  };
};

/**
 * Measurement-only: always calls `toolkit.next()`, no request is ever
 * allowed or rejected here.
 */
export const createProvenanceTelemetryPostAuthHandler = (
  getConfig: () => ProvenanceTelemetryConfig | undefined,
  incrementCounter: IncrementCounter
): OnPostAuthHandler => {
  return (request, response, toolkit) => {
    if (isSafeMethod(request.route.method)) {
      return toolkit.next();
    }

    const config = getConfig();
    if (
      config == null ||
      config.xsrf.disableProtection ||
      config.xsrf.allowlist.includes(request.route.path) ||
      request.route.options.xsrfRequired === false
    ) {
      return toolkit.next();
    }

    const classification = classifyProvenance(request);
    const increment = (counterName: string) =>
      incrementCounter({ counterType: PROVENANCE_TELEMETRY_COUNTER_TYPE, counterName });

    increment(`sec_fetch_site:${classification.secFetchSiteBucket}`);
    increment(`sec_fetch_mode:${classification.secFetchModeBucket}`);
    increment(`origin:${classification.originPresent ? 'present' : 'absent'}`);
    increment(`user_agent:${classification.isBrowserUa ? 'browser' : 'non_browser'}`);
    increment(`provenance_decision:${classification.wouldBlock ? 'would_block' : 'would_allow'}`);
    increment(`method:${classification.method}`);
    increment(`route_access:${classification.routeAccess}`);
    if (classification.gapBrowserMissingProvenance) {
      increment('gap:browser_missing_provenance');
    }

    return toolkit.next();
  };
};
