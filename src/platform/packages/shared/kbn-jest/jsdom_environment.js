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
    this.initialGlobalKeys = new Set(Reflect.ownKeys(this.global));
  }

  async teardown() {
    const { global, initialGlobalKeys } = this;
    await super.teardown();

    // V8 keeps a closed jsdom window's context alive. Jest 30 hangs closures over the test file's
    // Runtime (and so its whole module registry) off the window, so every file leaked hundreds of
    // MB in band. Dropping what was added after setup releases them; jsdom's own keys stay because
    // pending jsdom callbacks still read them after teardown.
    if (global) {
      for (const key of Reflect.ownKeys(global)) {
        if (!initialGlobalKeys.has(key)) {
          Reflect.deleteProperty(global, key);
        }
      }
    }
  }
}

module.exports = JSDOMEnvironment;
module.exports.TestEnvironment = JSDOMEnvironment;
