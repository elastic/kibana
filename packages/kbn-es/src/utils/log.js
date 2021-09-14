/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { ToolingLog } = require('@kbn/dev-utils');

const log = new ToolingLog({
  level: 'verbose',
  writeTo: process.stdout,
});

exports.log = log;
