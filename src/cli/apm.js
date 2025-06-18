/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { join } = require('path');
const { name, build } = require('../../package.json');
const { initApm } = require('@kbn/apm-config-loader');
const { once } = require('lodash');
const { initTelemetry } = require('@kbn/telemetry');

const rootDir = join(__dirname, '../..');
const isKibanaDistributable = Boolean(build && build.distributable === true);

module.exports = function (serviceName = name) {
  initApm(process.argv, rootDir, isKibanaDistributable, serviceName);
  const shutdown = once(initTelemetry(process.argv, rootDir, isKibanaDistributable, serviceName));

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('beforeExit', shutdown);

  return shutdown;
};
