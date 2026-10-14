#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Quick check that bootstrap has likely been run before loading linked packages
var fs = require('fs');
var path = require('path');

// pnpm writes this manifest after a successful install
var installMarker = path.resolve(__dirname, '..', 'node_modules', '.modules.yaml');
if (!fs.existsSync(installMarker)) {
  console.error('\nDependencies not installed. Run `node scripts/kbn bootstrap` first.\n');
  process.exit(1);
}

require('@kbn/setup-node-env');
require('@kbn/dev/run_check');
