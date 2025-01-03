/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// disable moment deprecation warnings
var moment = require('moment');
moment.suppressDeprecationWarnings = true;

// disable rison-node parsing errors
// eslint-disable-next-line @kbn/eslint/module_migration
var rison = require('rison-node');
rison.parser.prototype.error = function (message) {
  this.message = message;
  return undefined;
};
