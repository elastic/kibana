/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type AutoRefreshDoneFn = () => void;
/**
 * Creates a loop for timepicker's auto refresh
 * It has a "confirmation" mechanism:
 * When auto refresh loop emits, it won't continue automatically,
 * until each subscriber calls received `done` function.
 *
 * Also, it will pause when the page is not visible.
 *
 * @internal
 */
export declare const createAutoRefreshLoop: () => {
  stop: () => void;
  start: (timeout: number) => void;
  loop$: import('rxjs').Observable<AutoRefreshDoneFn>;
};
