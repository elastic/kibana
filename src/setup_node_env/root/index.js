/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

var force = require('./force')(process.argv);

var uid = process.getuid && process.getuid();
var isRoot = require('./is_root')(uid);

if (isRoot && !force) {
  console.error('Kibana should not be run as root.  Use --allow-root to continue.');
  process.exit(1);
}
