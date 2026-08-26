/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { REPO_ROOT, kibanaPackageJson, isKibanaDistributable } = require('@kbn/repo-info');
const { initApm } = require('@kbn/apm-config-loader');
const { initTelemetry } = require('@kbn/telemetry');

const distributable = isKibanaDistributable();

module.exports = function (serviceName = kibanaPackageJson.name, argv = process.argv) {
  initApm(argv, REPO_ROOT, distributable, serviceName);
  initTelemetry(argv, REPO_ROOT, distributable, serviceName);
};
