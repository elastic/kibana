/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { distinctUntilChanged, fromEvent, map, merge, shareReplay, startWith } from 'rxjs';

/**
 * Emits true during printing (window.beforeprint), false otherwise.
 */
export const isPrinting$ = merge(
  fromEvent(window, 'beforeprint').pipe(map(() => true)),
  fromEvent(window, 'afterprint').pipe(map(() => false))
).pipe(startWith(false), distinctUntilChanged(), shareReplay(1));
