/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi, expect } from 'vitest';
import { configure } from '@testing-library/dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import { i18n } from '@kbn/i18n';
import { IntersectionObserverStub } from '../_mocks/intersection_observer';
import { ResizeObserverStub } from '../_mocks/resize_observer';

/**
 * jsdom-specific setup for browser-like test environment.
 * This mirrors the Jest jsdom setup.
 */

// Suppress noisy warnings that are not relevant for unit tests
// eslint-disable-next-line no-console
const originalConsoleError = console.error;

// eslint-disable-next-line no-console
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';

  // Suppress Emotion CSS pseudo-class SSR warnings
  if (
    message.includes('The pseudo class') &&
    message.includes('is potentially unsafe when doing server-side rendering')
  ) {
    return;
  }

  originalConsoleError.apply(console, args);
};

// Extend Vitest's expect with jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
expect.extend(matchers);

// Configure Testing Library to use Kibana's data-test-subj attribute
configure({
  testIdAttribute: 'data-test-subj',
});

// Initialize kbn-i18n so I18nProvider works in tests
i18n.init({ locale: 'en', messages: {} });

// Mock window.matchMedia (not implemented in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo (not implemented in jsdom)
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock ResizeObserver (not implemented in jsdom)
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverStub,
});

// Mock IntersectionObserver (not implemented in jsdom)
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverStub,
});

// Mock window.getComputedStyle to return sensible defaults
const originalGetComputedStyle = window.getComputedStyle;
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: (element: Element, pseudoElement?: string | null) => {
    const style = originalGetComputedStyle(element, pseudoElement);
    // Return sensible defaults for commonly accessed properties
    return new Proxy(style, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (typeof value === 'function') {
          return value.bind(target);
        }
        // Return '0px' for dimension properties that might be empty
        if (
          typeof prop === 'string' &&
          (prop.includes('width') ||
            prop.includes('height') ||
            prop.includes('margin') ||
            prop.includes('padding'))
        ) {
          return value || '0px';
        }
        return value;
      },
    });
  },
});

// Mock canvas context (used by some charting libraries)
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: [] })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  clip: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  rect: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createPattern: vi.fn(),
});

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'blob:mock-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock clipboard API (configurable: true allows user-event to override)
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  configurable: true,
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
    write: vi.fn(() => Promise.resolve()),
    read: vi.fn(() => Promise.resolve([])),
  },
});

// Mock requestAnimationFrame and cancelAnimationFrame
let rafId = 0;
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn((callback: FrameRequestCallback) => {
    rafId += 1;
    setTimeout(() => callback(performance.now()), 0);
    return rafId;
  }),
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn((id: number) => {
    clearTimeout(id);
  }),
});
