/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const MutationObserver = require('mutation-observer');
Object.defineProperty(window, 'MutationObserver', { value: MutationObserver });

require('whatwg-fetch');

if (!global.URL.hasOwnProperty('createObjectURL')) {
  Object.defineProperty(global.URL, 'createObjectURL', { value: () => '' });
}

// https://github.com/jsdom/jsdom/issues/2524
if (!global.hasOwnProperty('TextEncoder')) {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// NOTE: We should evaluate removing this once we upgrade to Node 18 and find out if loaders.gl already fixed this usage
// or instead check if we can use the official Blob implementation.
// This is needed for x-pack/plugins/file_upload/public/importer/geo/geojson_importer/geojson_importer.test.js
//
// https://github.com/jsdom/jsdom/issues/2555
global.Blob = require('blob-polyfill').Blob;
