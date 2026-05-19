/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Fast local confidence gate: run quick checks on current pending local changes
// to address failures before PR CI.
const argv = process.argv.slice(2);
const hasFlag = (flag: string) => argv.some((arg) => arg === flag || arg.startsWith(`${flag}=`));

if (!hasFlag('--ref')) {
  process.argv.push('--ref', 'HEAD');
}

if (!hasFlag('--include-untracked') && !hasFlag('--no-include-untracked')) {
  process.argv.push('--include-untracked');
}

require('./precommit_hook');
