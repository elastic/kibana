/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// jsdom test environment that uses the repo's pinned `jsdom` version instead of the one
// bundled with `jest-environment-jsdom`, so jsdom can be upgraded independently of Jest.

const JSDOM = require('jsdom');
const { default: BaseJSDOMEnvironment } = require('@jest/environment-jsdom-abstract');

class JSDOMEnvironment extends BaseJSDOMEnvironment {
  constructor(config, context) {
    super(config, context, JSDOM);
  }
}

module.exports = JSDOMEnvironment;
module.exports.TestEnvironment = JSDOMEnvironment;
