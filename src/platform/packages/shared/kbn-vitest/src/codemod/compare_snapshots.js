/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Verifies that a migration (or `vitest -u`) only re-keyed snapshots: compares each .snap file
 * against its Jest version at a git ref, ignoring the differences Vitest introduces by design:
 *
 *  - keys join describe/test names with ' > ' (Jest: ' '; hints: Jest ': hint', Vitest ' > hint')
 *  - toThrowErrorMatchingSnapshot stores `[Error: message]` instead of `"message"`
 */

const { execFileSync } = require('child_process');
const Fs = require('fs');
const Path = require('path');
const Vm = require('vm');
const { REPO_ROOT } = require('@kbn/repo-info');

const load = (source) => {
  const exports = {};
  Vm.runInNewContext(source, { exports });
  return exports;
};

const normalizeKey = (key) => key.replace(/ > /g, ' ').replace(/: (\S)/, ' $1');
const normalizeValue = (value) => {
  // multi-line values are stored with surrounding newlines
  const trimmed = value.trim();
  const match = /^\[(?:\w*Error): ([\s\S]*)\]$/.exec(trimmed);
  return match ? JSON.stringify(match[1]) : trimmed;
};

/**
 * Compares `.snap` files with their versions at `baseRef` (the last commit before the
 * migration) and returns the entries that were dropped or changed.
 *
 * @param {string[]} files absolute paths
 * @param {{ baseRef?: string }} [options]
 */
const compareSnapshots = (files, { baseRef = 'HEAD' } = {}) => {
  const differences = [];
  let identical = 0;
  for (const file of files) {
    const repoPath = Path.relative(REPO_ROOT, file);
    const before = load(
      execFileSync('git', ['show', `${baseRef}:${repoPath}`], { cwd: REPO_ROOT, encoding: 'utf8' })
    );
    if (!Fs.existsSync(file)) {
      differences.push(`MISSING ${repoPath}`);
      continue;
    }

    const after = new Map(
      Object.entries(load(Fs.readFileSync(file, 'utf8'))).map(([key, value]) => [
        normalizeKey(key),
        value,
      ])
    );
    for (const [key, value] of Object.entries(before)) {
      const next = after.get(normalizeKey(key));
      if (next === undefined) {
        differences.push(`DROPPED ${repoPath} :: ${key}`);
      } else if (normalizeValue(next) !== normalizeValue(value)) {
        differences.push(`CHANGED ${repoPath} :: ${key}`);
      } else {
        identical++;
      }
    }
  }
  return { identical, differences };
};

module.exports = { compareSnapshots };
