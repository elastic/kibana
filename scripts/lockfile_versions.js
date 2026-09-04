/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Extract installed package versions from a yarn.lock or pnpm-lock.yaml, and
// diff two lockfiles (totals + which packages/versions are extra in either).
//   node scripts/lockfile_versions.js                  # diff repo yarn.lock vs pnpm-lock.yaml
//   node scripts/lockfile_versions.js <lock>           # totals for one lockfile (add --list)
//   node scripts/lockfile_versions.js <lockA> <lockB>  # diff two lockfiles
require('@kbn/setup-node-env');
require('@kbn/dev/lockfile_versions');
