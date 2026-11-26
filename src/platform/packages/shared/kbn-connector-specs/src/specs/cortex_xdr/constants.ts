/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Every public API route sits under this prefix of the tenant's API URL. */
export const API_PREFIX = '/public_api/v1';

/** The list APIs return at most 100 rows per request (search_to - search_from). */
export const PAGE_SIZE = 100;
/** Connector-side cap on the rows one list call collects across pages. */
export const MAX_RESULTS = 500;
export const DEFAULT_MAX_RESULTS = 100;

/** Response actions documented to take up to 1000 endpoint ids per request. */
export const MAX_ACTION_ENDPOINTS = 1000;
/** Endpoint id filters on list actions (one page of results). */
export const MAX_FILTER_ENDPOINTS = 100;
/** File retrieval is documented for at most 10 endpoints and 20 paths per request. */
export const MAX_RETRIEVAL_ENDPOINTS = 10;
export const MAX_RETRIEVAL_PATHS = 20;
/** Largest archive returned inline: leaves room for base64 within the action response limit. */
export const MAX_DOWNLOAD_BYTES = 768_000;
/** Issues are updated one request per id; bounded so one call stays within the rate limit budget. */
export const MAX_ISSUE_UPDATES = 50;

/** Each request times out after this long; the vendor documents no timeout. */
export const REQUEST_TIMEOUT_MS = 60_000;
/**
 * Kibana ends a connector run after about 120 s. Every request of one run shares this budget
 * (retries, pages, lookups, per-issue updates, downloads), so the run ends with a clear result first.
 */
export const ACTION_BUDGET_MS = 100_000;
/** No request is started with less than this left of the budget. */
export const MIN_REQUEST_BUDGET_MS = 1_000;

/** Cortex XDR allows 10 requests per second per tenant and sends no Retry-After header. */
export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 1_000;
export const RETRY_MAX_DELAY_MS = 4_000;
export const RETRY_JITTER_MAX_MS = 250;
/** Retried for reads. State-changing calls retry 429 only: a 5xx may have been dispatched. */
export const RETRYABLE_READ_STATUSES: readonly number[] = [429, 500, 502, 503, 504];
export const RETRYABLE_WRITE_STATUSES: readonly number[] = [429];

/** is_isolated values that mean an endpoint is already in, or moving to, each state. */
export const ISOLATED_STATES: readonly string[] = ['AGENT_ISOLATED', 'AGENT_PENDING_ISOLATION'];
export const UNISOLATED_STATES: readonly string[] = [
  'AGENT_UNISOLATED',
  'AGENT_PENDING_ISOLATION_CANCELLATION',
];

export const SHA256_PATTERN = /^[A-Fa-f0-9]{64}$/;
