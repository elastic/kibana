/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { createPageVisibility$ } from './page_visibility';

let mockPageVisibility: DocumentVisibilityState = 'visible';
vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => mockPageVisibility);

test('createPageVisibility$ returns an observable that emits visibility state', () => {
  const pageVisibility$ = createPageVisibility$();

  const fn = vi.fn();
  pageVisibility$.subscribe(fn);

  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenLastCalledWith('visible');

  mockPageVisibility = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));

  expect(fn).toHaveBeenCalledTimes(2);
  expect(fn).toHaveBeenLastCalledWith('hidden');
});
