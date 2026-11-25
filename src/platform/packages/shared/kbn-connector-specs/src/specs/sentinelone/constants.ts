/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const SENTINELONE_CONNECTOR_TYPE_ID = '.sentinelone2';

/** Every SentinelOne management API route lives under this prefix on the console host. */
export const API_PREFIX = '/web/api/v2.1';

export const REQUEST_TIMEOUT_MS = 60_000;

/** 25 MB: covers a 10 MB fetch-files archive with headroom; larger responses fail instead of truncating. */
export const MAX_RESPONSE_BYTES = 25 * 1024 * 1024;

export const MAX_ATTEMPTS = 3;
export const RETRY_AFTER_CAP_MS = 30_000;
/** Fallback waits before attempt 2 and 3 when no Retry-After header is sent. */
export const BACKOFF_MS: readonly number[] = [2_000, 5_000];
export const BACKOFF_JITTER_MS = 500;

/** Reads retry on throttling and transient gateway errors. */
export const READ_RETRY_STATUSES: readonly number[] = [429, 502, 503, 504];
/** State-changing calls retry only when SentinelOne rejected the request before acting. */
export const WRITE_RETRY_STATUSES: readonly number[] = [429];

export const MAX_DOWNLOAD_REDIRECTS = 5;

/** Remote script status polling for runScriptAndWait. */
export const SCRIPT_POLL_INTERVAL_MS = 5_000;
export const SCRIPT_FINAL_STATUSES: readonly string[] = [
  'completed',
  'failed',
  'canceled',
  'expired',
  'partially_completed',
];

/** The blocklist routes share /restrictions with exclusions; this type keeps them on the blocklist. */
export const BLOCKLIST_TYPE = 'black_hash';

export const FILE_TOO_LARGE_MESSAGE =
  'File larger than 25 MB; download it from the SentinelOne console';

export const NO_SCRIPT_TARGET_MESSAGE = 'A filter must be defined; either ids or uuids';
