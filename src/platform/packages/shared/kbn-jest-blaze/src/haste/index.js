/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// CJS entry file for haste_map.ts, as Jest might load the haste map
// earlier than we get to include setup_node_env.

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
require('../../../../../../setup_node_env');

module.exports = require('./haste_map');
