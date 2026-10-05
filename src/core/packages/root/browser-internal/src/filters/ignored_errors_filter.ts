/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterFn, Payload } from './types';

// Chromium reports this benign ResizeObserver condition as an uncaught error.
export const RESIZE_OBSERVER_LOOP_ERROR =
  'ResizeObserver loop completed with undelivered notifications.';

/**
 * Errors are matched on `exception.message` only. The browser dispatches these as bare
 * `error` events without an `Error` object, so the RUM agent has no name to derive
 * `exception.type` from and reports it as an empty string.
 */
export const IGNORED_ERROR_MESSAGES = [RESIZE_OBSERVER_LOOP_ERROR];

/** Drops errors reported by the browser that are known to be benign. */
export const ignoredErrorsFilter: FilterFn = (payload: Payload) => {
  if (!payload.errors) {
    return payload;
  }

  payload.errors = payload.errors.filter(
    (error) => !IGNORED_ERROR_MESSAGES.includes(error.exception?.message ?? '')
  );

  return payload;
};
