/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterFn } from './types';
export declare const RESIZE_OBSERVER_LOOP_ERROR =
  'ResizeObserver loop completed with undelivered notifications.';
/**
 * Errors are matched on `exception.message` only. The browser dispatches these as bare
 * `error` events without an `Error` object, so the RUM agent has no name to derive
 * `exception.type` from and reports it as an empty string.
 */
export declare const IGNORED_ERROR_MESSAGES: string[];
/** Drops errors reported by the browser that are known to be benign. */
export declare const ignoredErrorsFilter: FilterFn;
