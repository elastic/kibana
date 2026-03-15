/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');

if (process.argv.length !== 3) throw new Error('Usage: node scripts/sha256.js <string to hash>');

var Sha256 = require('@kbn/crypto-browser').Sha256;
var sha256 = new Sha256().update(process.argv[2], 'utf8').digest('hex');
console.log(sha256);
