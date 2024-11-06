/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');

module.exports = {
  'temp-dir': process.env.COVERAGE_TEMP_DIR
    ? path.resolve(process.env.COVERAGE_TEMP_DIR, 'jest')
    : 'target/kibana-coverage/jest',
  'report-dir': 'target/kibana-coverage/jest-combined',
  reporter: ['html', 'json-summary'],
};
