/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Verifies that `vitest -u` only re-keyed snapshots: compares each .snap file against its Jest
 * version at git HEAD, ignoring the differences Vitest introduces by design:
 *
 *  - keys join describe/test names with ' > ' (Jest: ' '; hints: Jest ': hint', Vitest ' > hint')
 *  - toThrowErrorMatchingSnapshot stores `[Error: message]` instead of `"message"`
 *
 * Usage: node src/platform/packages/shared/kbn-test/src/vitest/codemod/compare_snapshots.js <file.snap...>
 */

const { execFileSync } = require('child_process');
const Fs = require('fs');
const Vm = require('vm');

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

let identical = 0;
let differing = 0;
for (const file of process.argv.slice(2)) {
  const before = load(execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' }));
  if (!Fs.existsSync(file)) {
    process.stdout.write(`MISSING ${file}\n`);
    differing++;
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
      process.stdout.write(`DROPPED ${file} :: ${key}\n`);
      differing++;
    } else if (normalizeValue(next) !== normalizeValue(value)) {
      process.stdout.write(`CHANGED ${file} :: ${key}\n`);
      differing++;
    } else {
      identical++;
    }
  }
}

process.stdout.write(`identical=${identical} differing=${differing}\n`);
process.exitCode = differing ? 1 : 0;
