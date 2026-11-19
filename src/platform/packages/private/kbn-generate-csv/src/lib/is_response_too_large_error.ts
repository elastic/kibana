/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The search strategies rethrow the Elasticsearch client's `RequestAbortedError` as their own
// error type and keep only its message, so the message is all that identifies it here.
const RESPONSE_TOO_LARGE_MESSAGE = /content length \(\d+\) is bigger than the maximum allowed/;

/** True when Elasticsearch returned more data than Kibana accepts in a single response. */
export const isResponseTooLargeError = (error: unknown): boolean =>
  error instanceof Error && RESPONSE_TOO_LARGE_MESSAGE.test(error.message);
