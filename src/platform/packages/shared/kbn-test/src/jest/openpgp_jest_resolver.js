/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-globals */

// openpgp v6 Node CJS build uses createRequire(document.baseURI) when document
// exists (jsdom), producing an invalid http://localhost/openpgp.min.cjs URL.
// Temporarily hide document so the build takes the Node.js path instead.
const savedDocument = global.document;
delete global.document;

// eslint-disable-next-line @kbn/imports/no_unresolvable_imports
const openpgp = require('openpgp/dist/node/openpgp.min.cjs');

if (savedDocument !== undefined) {
  global.document = savedDocument;
}

module.exports = openpgp;
