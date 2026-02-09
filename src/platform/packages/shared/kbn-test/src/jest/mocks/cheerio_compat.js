/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Cheerio compatibility shim for enzyme.
 *
 * cheerio 1.2.0 removed the callable default export and the static `root()` method
 * that enzyme relies on. This shim restores those for backward compatibility:
 *
 *  - enzyme's `_interopRequireDefault(require('cheerio')).default.root()` needs
 *    `module.exports.default` to be a callable function with `.root()` and `.load()`.
 *  - enzyme's `require('cheerio/lib/utils')` moved to `cheerio/utils` — handled by
 *    the Jest resolver, not this shim.
 *
 * This shim is only used in Jest tests via the custom resolver in resolver.js.
 */

const Path = require('path');

// Resolve the real cheerio package by absolute path to avoid re-entering this shim
// through the Jest resolver redirect.
const cheerioDir = Path.dirname(require.resolve('cheerio/package.json'));
// eslint-disable-next-line import/no-dynamic-require
const realCheerio = require(Path.join(cheerioDir, 'dist', 'commonjs', 'index.js'));
// eslint-disable-next-line import/no-dynamic-require
const staticMethods = require(Path.join(cheerioDir, 'dist', 'commonjs', 'static.js'));

// Build a callable default export that mimics cheerio rc.12 behavior.
// In rc.12, `require('cheerio')` returned a function (`$`) with static methods.
// enzyme calls: `cheerio.root()`, `cheerio.load(html)`, and `cheerio(html)`.
function cheerioDefault(html) {
  return realCheerio.load('')(html);
}

// Attach static methods enzyme uses
cheerioDefault.load = realCheerio.load;
cheerioDefault.root = function () {
  return realCheerio.load('').root();
};

// Attach remaining static methods (contains, merge, html, xml, text, etc.)
Object.keys(staticMethods).forEach((key) => {
  if (!(key in cheerioDefault)) {
    cheerioDefault[key] = staticMethods[key];
  }
});

// Re-export everything from the real cheerio module
const allExports = { ...realCheerio };

// Provide the default export for enzyme's _interopRequireDefault
allExports.default = cheerioDefault;

// Mark as ES module so _interopRequireDefault passes through and uses .default
Object.defineProperty(allExports, '__esModule', { value: true });

module.exports = allExports;
