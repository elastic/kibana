/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const MutationObserver = require('mutation-observer');
Object.defineProperty(window, 'MutationObserver', { value: MutationObserver });

require('whatwg-fetch');

if (!Object.hasOwn(global.URL, 'createObjectURL')) {
  Object.defineProperty(global.URL, 'createObjectURL', { value: () => '' });
}

// https://github.com/jsdom/jsdom/issues/2524
if (!Object.hasOwn(global, 'TextEncoder')) {
  const customTextEncoding = require('@kayahr/text-encoding');
  global.TextEncoder = customTextEncoding.TextEncoder;
  global.TextDecoder = customTextEncoding.TextDecoder;
}

// NOTE: We should evaluate removing this once we upgrade to Node 18 and find out if loaders.gl already fixed this usage
// or instead check if we can use the official Blob implementation.
// This is needed for x-pack/platform/plugins/private/file_upload/public/importer/geo/geojson_importer/geojson_importer.test.js
//
// https://github.com/jsdom/jsdom/issues/2555
global.Blob = require('blob-polyfill').Blob;

if (!Object.hasOwn(global, 'ResizeObserver')) {
  global.ResizeObserver = require('resize-observer-polyfill');
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

export const getJsDomPerformanceFix = () => {
  // eslint-disable-next-line prefer-object-spread
  const originalGetComputedStyle = Object.assign({}, window.getComputedStyle);

  return {
    fix: () => {
      // The JSDOM implementation is too slow
      // Especially for dropdowns that try to position themselves
      // perf issue - https://github.com/jsdom/jsdom/issues/3234
      Object.defineProperty(window, 'getComputedStyle', {
        value: (el) => {
          /**
           * This is based on the jsdom implementation of getComputedStyle
           * https://github.com/jsdom/jsdom/blob/9dae17bf0ad09042cfccd82e6a9d06d3a615d9f4/lib/jsdom/browser/Window.js#L779-L820
           *
           * It is missing global style parsing and will only return styles applied directly to an element.
           * Will not return styles that are global or from emotion
           */
          const declaration = new CSSStyleDeclaration();
          const { style } = el;

          Array.prototype.forEach.call(style, (property) => {
            declaration.setProperty(
              property,
              style.getPropertyValue(property),
              style.getPropertyPriority(property)
            );
          });

          return declaration;
        },
        configurable: true,
        writable: true,
      });
    },
    cleanup: () => {
      Object.defineProperty(window, 'getComputedStyle', originalGetComputedStyle);
    },
  };
};

const { fix } = getJsDomPerformanceFix();
fix();
