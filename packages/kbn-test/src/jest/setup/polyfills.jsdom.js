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
// This is needed for x-pack/plugins/file_upload/public/importer/geo/geojson_importer/geojson_importer.test.js
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
