/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// bluebird < v3.3.5 does not work with MutationObserver polyfill
// when MutationObserver exists, bluebird avoids using node's builtin async schedulers
const bluebird = require('bluebird');
bluebird.Promise.setScheduler(function (fn) {
  global.setImmediate.call(global, fn);
});

const MutationObserver = require('mutation-observer');
Object.defineProperty(window, 'MutationObserver', { value: MutationObserver });

require('whatwg-fetch');

if (!global.URL.hasOwnProperty('createObjectURL')) {
  Object.defineProperty(global.URL, 'createObjectURL', { value: () => '' });
}

// Will be replaced with a better solution in EUI
// https://github.com/elastic/eui/issues/3713
global._isJest = true;
