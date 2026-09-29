/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

const originalResizeObserver = global.ResizeObserver;
const originalScrollIntoView = Element.prototype.scrollIntoView;
const originalClientHeightDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientHeight'
);

const mockResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
const mockedScrollIntoView = vi.fn();

beforeAll(() => {
  global.ResizeObserver = mockResizeObserver;
  Element.prototype.scrollIntoView = mockedScrollIntoView;
});

const areFakeTimersEnabled = () =>
  typeof vi.isMockFunction === 'function' && vi.isMockFunction(setTimeout);

beforeEach(() => {
  vi.useFakeTimers();
  mockedScrollIntoView.mockClear();
  localStorage.clear();
});

afterEach(() => {
  if (areFakeTimersEnabled()) {
    vi.runOnlyPendingTimers();
  }
  vi.useRealTimers();
});

afterAll(() => {
  global.ResizeObserver = originalResizeObserver;
  Element.prototype.scrollIntoView = originalScrollIntoView;

  if (originalClientHeightDescriptor) {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeightDescriptor);
  }

  vi.clearAllMocks();
});
