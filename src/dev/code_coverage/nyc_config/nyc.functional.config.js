/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const defaultExclude = require('@istanbuljs/schema/default-exclude');
const extraExclude = ['data/optimize/**', 'src/core/server/**', '**/{test, types}/**/*'];
const path = require('path');

module.exports = {
  'temp-dir': process.env.COVERAGE_TEMP_DIR
    ? path.resolve(process.env.COVERAGE_TEMP_DIR, 'functional')
    : 'target/kibana-coverage/functional',
  'report-dir': 'target/kibana-coverage/functional-combined',
  reporter: ['html', 'json-summary'],
  exclude: extraExclude.concat(defaultExclude),
};
