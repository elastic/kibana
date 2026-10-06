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
/** Counter type used to group all provenance dry-run measurements under the `core` usage domain. */
export declare const PROVENANCE_TELEMETRY_COUNTER_TYPE = 'xsrf_provenance';
declare const SEC_FETCH_SITE_BUCKETS: readonly ['same-origin', 'same-site', 'cross-site', 'none'];
type KnownSecFetchSiteBucket = (typeof SEC_FETCH_SITE_BUCKETS)[number];
export type SecFetchSiteBucket = KnownSecFetchSiteBucket | 'absent' | 'other';
declare const SEC_FETCH_MODE_BUCKETS: readonly [
  'cors',
  'navigate',
  'no-cors',
  'same-origin',
  'websocket'
];
type KnownSecFetchModeBucket = (typeof SEC_FETCH_MODE_BUCKETS)[number];
export type SecFetchModeBucket = KnownSecFetchModeBucket | 'other' | 'absent';
export declare const isLikelyModernBrowser: (userAgent: string | undefined) => boolean;
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
/**
 * Only enums/booleans leave this function, no raw header values, so no PII is recorded.
 */
export declare const classifyProvenance: (request: KibanaRequest) => ProvenanceClassification;
/**
 * Measurement-only: always calls `toolkit.next()`, no request is ever
 * allowed or rejected here.
 */
export declare const createProvenanceTelemetryPostAuthHandler: (
  getConfig: () => ProvenanceTelemetryConfig | undefined,
  incrementCounter: IncrementCounter
) => OnPostAuthHandler;
export {};
