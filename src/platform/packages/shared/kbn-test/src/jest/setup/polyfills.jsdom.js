/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Required until JSDOM supports fetch: https://github.com/jsdom/jsdom/issues/1724
require('whatwg-fetch');

// Monaco's clipboard contribution calls this deprecated browser API during module evaluation.
// JSDOM does not implement it; node environments may not define `document`.
if (typeof document !== 'undefined' && typeof document.queryCommandSupported !== 'function') {
  Object.defineProperty(document, 'queryCommandSupported', { value: () => true });
}

if (!Object.hasOwn(global.URL, 'createObjectURL')) {
  Object.defineProperty(global.URL, 'createObjectURL', { value: () => '' });
}

// https://github.com/jsdom/jsdom/issues/2524
if (!Object.hasOwn(global, 'TextEncoder')) {
  const { TextEncoder: NodeTextEncoder, TextDecoder } = require('node:util');

  global.TextEncoder = class TextEncoder extends NodeTextEncoder {
    encode(input = '') {
      return global.Uint8Array.from(super.encode(input));
    }
  };
  global.TextDecoder = TextDecoder;
}

// JSDOM 20's Blob lacks .arrayBuffer() and .text() (jsdom#2555).
// Patch the missing methods with a FileReader rather than pulling in blob-polyfill.
if (typeof Blob !== 'undefined') {
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function () {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(this);
      });
    };
  }
  if (!Blob.prototype.text) {
    Blob.prototype.text = function () {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(this);
      });
    };
  }
}

if (!Object.hasOwn(global, 'ResizeObserver')) {
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe(element) {
      element.addEventListener('resize', this.callback);
    }
    unobserve(element) {
      element.removeEventListener('resize', this.callback);
    }
    disconnect() {}
  };
}

if (!Object.hasOwn(global, 'Worker')) {
  class Worker {
    constructor(stringUrl) {
      this.url = stringUrl;
      this.onmessage = () => {};
    }

    postMessage(msg) {
      this.onmessage(msg);
    }
  }

  global.Worker = Worker;

  // Mocking matchMedia to resolve TypeError: window.matchMedia is not a function
  // For more info, see https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
  if (!Object.hasOwn(global, 'matchMedia')) {
    Object.defineProperty(global, 'matchMedia', {
      writable: true,
      value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
      }),
    });
  }
}

// @elastic/elasticsearch imports undici that requires on MessagePort (even when unused in the tests)
if (!Object.hasOwn(global, 'MessagePort')) {
  global.MessagePort = {};
}

// Required from ts decorators support in tests
import 'reflect-metadata/lite';

// Monaco's Safari workaround (added in 0.45.0) uses ClipboardItem, which doesn't exist in JSDOM.
// JSDOM's user agent contains "AppleWebKit" without "Chrome" or "Safari", so Monaco treats the
// test environment as a WebKit web view and installs the workaround in every test.
if (!Object.hasOwn(global, 'ClipboardItem')) {
  global.ClipboardItem = class ClipboardItem {
    constructor(data) {
      this.data = data;

      // Monaco passes a pending DeferredPromise as the item data and cancels it on the next
      // click/keydown, rejecting it with a CancellationError. In a real browser the user agent
      // consumes that promise; here nothing does, so the rejection surfaces as unhandled and fails
      // whichever test is running. Attaching a catch mirrors browser behavior explicitly targeting the
      // expected monaco clipboard cancellation.
      for (const value of Object.values(data ?? {})) {
        if (typeof value?.catch === 'function') {
          value.catch((error) => {
            if (error?.message !== 'Canceled' || error?.name !== 'Canceled') {
              throw error;
            }
          });
        }
      }
    }

    get types() {
      return Object.keys(this.data);
    }

    async getType(type) {
      const data = this.data[type];
      if (typeof data === 'string') {
        return new Blob([data]);
      }
      if (data instanceof Blob) {
        return data;
      }
      // It's a PromiseLike
      const resolved = await data;
      return typeof resolved === 'string' ? new Blob([resolved]) : resolved;
    }
  };
}
