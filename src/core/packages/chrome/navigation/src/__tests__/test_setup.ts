/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const originalResizeObserver = global.ResizeObserver;
const originalScrollIntoView = Element.prototype.scrollIntoView;
const originalClientHeightDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientHeight'
);

const mockResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
const mockedScrollIntoView = jest.fn();

beforeAll(() => {
  global.ResizeObserver = mockResizeObserver;
  Element.prototype.scrollIntoView = mockedScrollIntoView;
});

const areFakeTimersEnabled = () =>
  typeof jest.isMockFunction === 'function' && jest.isMockFunction(setTimeout);

beforeEach(() => {
  jest.useFakeTimers();
  mockedScrollIntoView.mockClear();
});

afterEach(() => {
  if (areFakeTimersEnabled()) {
    jest.runOnlyPendingTimers();
  }
  jest.useRealTimers();
});

afterAll(() => {
  global.ResizeObserver = originalResizeObserver;
  Element.prototype.scrollIntoView = originalScrollIntoView;

  if (originalClientHeightDescriptor) {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeightDescriptor);
  }

  jest.clearAllMocks();
});
