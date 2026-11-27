/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Lists, per extension point, which plugins contribute to it, collect it, and look it up.
// Extension points have no manifest edge, so this is how to find who uses whom.
// Call sites are mapped to extension point ids through the `createExtensionPoint<...>('id')`
// declarations in the scanned files; an identifier with no single declaration is reported by name.
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

const IDENTIFIER = '[A-Za-z_$][\\w$]*';
const KINDS = [
  { key: 'contribute', label: 'contributed by' },
  { key: 'collect', label: 'collected by' },
  { key: 'lookup', label: 'looked up by' },
];
const DECLARATION = new RegExp(
  `\\b(?:const|let|var)\\s+(${IDENTIFIER})\\s*(?::[^=]+)?=\\s*createExtensionPoint\\s*(?:<[\\s\\S]*?>)?\\s*\\(\\s*(['"\`])(.+?)\\2`,
  'g'
);
const EXTENSIONS_CALL = new RegExp(
  `\\bextensions\\s*\\.\\s*(contribute|collect)\\(\\s*(${IDENTIFIER})`,
  'g'
);
const LOOKUP_CALL = new RegExp(
  `(${IDENTIFIER})\\s*\\??\\.\\s*(?:get|getAll)\\(\\s*(${IDENTIFIER})\\s*\\)`,
  'g'
);
const SERVICE_VARIABLES = [
  new RegExp(`(${IDENTIFIER})\\s*\\??:\\s*ExtensionService\\b`, 'g'),
  new RegExp(`(${IDENTIFIER})\\s*=\\s*[\\w$.]+\\.get\\(\\s*ExtensionService\\s*\\)`, 'g'),
];
const PREFILTER = 'createExtensionPoint|extensions|ExtensionService';

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

// A receiver typed or assigned as `ExtensionService` always counts; one only named like it
// counts when the argument is a declared extension point, which skips plain maps named `extensions`.
function isLookup(receiver, identifier, serviceVariables) {
  return serviceVariables.has(receiver) || (/extension/i.test(receiver) && ids.has(identifier));
}

const files = (listCandidatesWithRipgrep(ROOTS) ?? listCandidatesByWalking(ROOTS))
  .filter((file) => !TEST_FILE.test(file))
  .sort();
const sources = files
  .map((file) => ({ file, source: Fs.readFileSync(Path.resolve(REPO_ROOT, file), 'utf8') }))
  .filter(({ source }) => DI_IMPORT.test(source))
  .map(({ file, source }) => ({ file, code: stripComments(source) }));

const ids = new Map();
for (const { code } of sources) {
  for (const [, identifier, , id] of code.matchAll(DECLARATION)) {
    ids.set(identifier, new Set([...(ids.get(identifier) ?? []), id]));
  }
}

const resolveId = (identifier) => {
  const candidates = [...(ids.get(identifier) ?? [])];

  return candidates.length === 1 ? candidates[0] : `${identifier} (no single declaration)`;
};

const edges = new Map();
const addEdge = (identifier, kind, owner) => {
  const id = resolveId(identifier);
  if (!edges.has(id)) {
    edges.set(id, Object.fromEntries(KINDS.map(({ key }) => [key, new Set()])));
  }
  edges.get(id)[kind].add(owner);
};

for (const { file, code } of sources) {
  const owner = getOwner(file);
  const serviceVariables = new Set(
    SERVICE_VARIABLES.flatMap((regex) => [...code.matchAll(regex)].map(([, name]) => name))
  );

  for (const [, kind, identifier] of code.matchAll(EXTENSIONS_CALL)) {
    addEdge(identifier, kind, owner);
  }
  for (const [, receiver, identifier] of code.matchAll(LOOKUP_CALL)) {
    if (identifier !== 'ExtensionService' && isLookup(receiver, identifier, serviceVariables)) {
      addEdge(identifier, 'lookup', owner);
    }
  }
}

const width = Math.max(...KINDS.map(({ label }) => label.length)) + 1;
const lines = [...edges.keys()].sort().flatMap((id) => [
  id,
  ...KINDS.map(({ key, label }) => {
    const owners = [...edges.get(id)[key]].sort();

    return `  ${`${label}:`.padEnd(width + 1)} ${owners.length ? owners.join(', ') : '-'}`;
  }),
  '',
]);

process.stdout.write(
  lines.length ? lines.join('\n') : `No extension point calls found in ${ROOTS.join(', ')}.\n`
);
