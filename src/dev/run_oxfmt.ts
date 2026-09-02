/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';

import { OXFMT_BIN_PATH, OXFMT_CONFIG_PATH } from '@kbn/dev-utils';

// Thin wrapper around the oxfmt CLI that pins the repo config so it works from any cwd.
// `node scripts/oxfmt` formats every JS/TS file in the repo; pass paths to narrow it down and
// `--check` to only report unformatted files. See `node scripts/oxfmt --help` for all flags.
const { status } = spawnSync(
  process.execPath,
  [OXFMT_BIN_PATH, '--config', OXFMT_CONFIG_PATH, ...process.argv.slice(2)],
  { stdio: 'inherit' }
);

process.exit(status ?? 1);
