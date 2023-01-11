/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

var Fs = require('fs');
var Path = require('path');
var Cp = require('child_process');

var REPO_ROOT = Path.resolve(__dirname, '..');
if (Fs.existsSync(Path.resolve(REPO_ROOT, '.git/MERGE_HEAD'))) {
  process.stdout.write(
    'Bootstrapping before running pre-commit hook, now that merge is applied...\n'
  );
  Cp.execFileSync('yarn', ['kbn', 'bootstrap'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  process.stdout.write('\n✅ Bootstrap successful, resuming pre-commit hook...\n');
}

require('../src/setup_node_env');
require('../src/dev/run_precommit_hook');
