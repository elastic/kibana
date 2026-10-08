/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var path = require('path');

var REPO = process.env.KBN_REPO || path.resolve(__dirname, '../..');
var OUT = process.env.KBN_PLUGIN_BUNDLE_OUT || '/tmp/kibana-server-plugin-bundle';

module.exports = { REPO: REPO, OUT: OUT };
