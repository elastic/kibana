/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Module = require('module');
const resolve = require('resolve');

// openpgp v6 Node CJS build calls createRequire(document.baseURI) at load time
// when document exists (jsdom). In jsdom, document.baseURI is "http://localhost",
// producing an invalid URL for createRequire which only accepts file paths.
// Temporarily override createRequire to handle HTTP URLs gracefully.

const openpgpPath = resolve.sync('openpgp', { basedir: __dirname });

const originalCreateRequire = Module.createRequire;
Module.createRequire = function (filename) {
  if (typeof filename === 'string' && filename.startsWith('http://')) {
    return originalCreateRequire(__filename);
  }
  return originalCreateRequire.apply(this, arguments);
};

// eslint-disable-next-line import/no-dynamic-require
module.exports = require(openpgpPath);

Module.createRequire = originalCreateRequire;
