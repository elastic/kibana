/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Lists, per soft dependency token, which plugins expose, collect, and look it up.
// Soft dependencies have no manifest edge, so this is how to find who uses whom.
// Tokens are grouped by the identifier passed at the call site, not by the token id.
// Usage: node report_edges.js [dir ...]   (defaults to src x-pack examples)
const Fs = require('fs');
const Path = require('path');
const { spawnSync } = require('child_process');
const { findPackageForPath } = require('@kbn/repo-packages');

const REPO_ROOT = Path.resolve(__dirname, '../../..');
const ROOTS = process.argv.length > 2 ? process.argv.slice(2) : ['src', 'x-pack', 'examples'];
const SKIPPED_DIRS = new Set(['node_modules', 'target', 'build', '.git']);
const SOURCE_FILE = /\.tsx?$/;
const TEST_FILE = /\.(test|mock)\.tsx?$/;
const DI_IMPORT = /from '@kbn\/core-di'/;

const KINDS = [
  { key: 'expose', label: 'exposed by' },
  { key: 'collect', label: 'collected by' },
  { key: 'lookup', label: 'looked up by' },
];
const PATTERNS = [
  { regex: /(?<![\w$.])(expose|collect)\(\s*([A-Za-z_$][\w$]*)/g },
  {
    regex: /\bsoftDependencies\s*\.\s*(?:get|getAll)\(\s*([A-Za-z_$][\w$]*)\s*\)/g,
    kind: 'lookup',
  },
];
const PREFILTER = 'expose\\(|collect\\(|softDependencies';

function listCandidatesWithRipgrep(roots) {
  const result = spawnSync(
    'rg',
    ['--files-with-matches', '--glob', '*.{ts,tsx}', '--regexp', PREFILTER, ...roots],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    return undefined;
  }

  return result.stdout.split('\n').filter(Boolean);
}

function listCandidatesByWalking(roots) {
  const files = [];
  const walk = (dir) => {
    for (const entry of Fs.readdirSync(Path.resolve(REPO_ROOT, dir), { withFileTypes: true })) {
      const path = Path.join(dir, entry.name);
      if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) {
        walk(path);
      } else if (entry.isFile() && SOURCE_FILE.test(entry.name)) {
        files.push(path);
      }
    }
  };
  roots.filter((root) => Fs.existsSync(Path.resolve(REPO_ROOT, root))).forEach(walk);

  return files;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function getOwner(file) {
  const pkg = findPackageForPath(REPO_ROOT, Path.resolve(REPO_ROOT, file));
  if (!pkg) {
    return file;
  }

  return pkg.manifest.plugin?.id ?? `${pkg.id} (package)`;
}

const files = listCandidatesWithRipgrep(ROOTS) ?? listCandidatesByWalking(ROOTS);
const edges = new Map();

for (const file of files.sort()) {
  if (TEST_FILE.test(file)) {
    continue;
  }

  const source = Fs.readFileSync(Path.resolve(REPO_ROOT, file), 'utf8');
  if (!DI_IMPORT.test(source)) {
    continue;
  }

  const code = stripComments(source);
  const owner = getOwner(file);
  for (const { regex, kind } of PATTERNS) {
    for (const match of code.matchAll(regex)) {
      const [key, token] = kind ? [kind, match[1]] : [match[1], match[2]];
      if (!edges.has(token)) {
        edges.set(token, Object.fromEntries(KINDS.map((entry) => [entry.key, new Set()])));
      }
      edges.get(token)[key].add(owner);
    }
  }
}

const width = Math.max(...KINDS.map(({ label }) => label.length)) + 1;
const lines = [...edges.keys()].sort().flatMap((token) => [
  token,
  ...KINDS.map(({ key, label }) => {
    const owners = [...edges.get(token)[key]].sort();

    return `  ${`${label}:`.padEnd(width + 1)} ${owners.length ? owners.join(', ') : '-'}`;
  }),
  '',
]);

process.stdout.write(
  lines.length ? lines.join('\n') : `No soft dependency calls found in ${ROOTS.join(', ')}.\n`
);
