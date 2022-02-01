/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');
const untils = require('@kbn/utils');

module.exports = {
  'temp-dir': process.env.COVERAGE_TEMP_DIR
    ? path.resolve(process.env.COVERAGE_TEMP_DIR, 'jest')
    : path.resolve(untils.REPO_ROOT, 'target/kibana-coverage/jest'),
  'report-dir': path.resolve(untils.REPO_ROOT, 'target/kibana-coverage/jest-combined'),
  reporter: ['html', 'json-summary'],
};
