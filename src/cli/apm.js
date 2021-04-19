/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { join } = require('path');
const { name, build } = require('../../package.json');
const { initApm } = require('@kbn/apm-config-loader');

const rootDir = join(__dirname, '../..');
const isKibanaDistributable = Boolean(build && build.distributable === true);

module.exports = function (serviceName = name) {
  initApm(process.argv, rootDir, isKibanaDistributable, serviceName);
};
