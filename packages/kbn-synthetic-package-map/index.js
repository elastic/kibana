/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = require('fs');
const Path = require('path');
const Crypto = require('crypto');

const PACKAGE_MAP_PATH = Path.resolve(__dirname, 'synthetic-packages.json');

function readPackageMap() {
  return new Map(JSON.parse(Fs.readFileSync(PACKAGE_MAP_PATH, 'utf8')));
}

function readHashOfPackageMap() {
  return Crypto.createHash('sha256').update(Fs.readFileSync(PACKAGE_MAP_PATH)).digest('hex');
}

module.exports = {
  readPackageMap,
  readHashOfPackageMap,
};
