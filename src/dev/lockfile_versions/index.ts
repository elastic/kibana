/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { parseLockfile, snapshotKeyToNameVersion } from '@kbn/yarn-lock-validator';

type LockFormat = 'yarn' | 'pnpm';

/** name -> set of resolved versions found in a lockfile */
type PackageMap = Map<string, Set<string>>;

interface Lock {
  file: string;
  format: LockFormat;
  packages: PackageMap;
}

interface Flags {
  json: boolean;
  list: boolean;
  quiet: boolean;
}

export function runLockfileVersions(argv: string[]): number {
  const { files, flags } = parseArgs(argv);
  const locks = files.map(readLock);
  return locks.length === 1 ? reportSingle(locks[0], flags) : reportDiff(locks[0], locks[1], flags);
}

function parseArgs(argv: string[]): { files: string[]; flags: Flags } {
  const flags: Flags = { json: false, list: false, quiet: false };
  const files: string[] = [];
  for (const arg of argv) {
    if (arg === '--json') flags.json = true;
    else if (arg === '--list') flags.list = true;
    else if (arg === '--quiet') flags.quiet = true;
    else files.push(Path.resolve(arg));
  }
  if (files.length === 0) {
    files.push(Path.join(REPO_ROOT, 'yarn.lock'), Path.join(REPO_ROOT, 'pnpm-lock.yaml'));
  }
  return { files, flags };
}

function readLock(file: string): Lock {
  if (!Fs.existsSync(file)) {
    throw new Error(`Lockfile not found: ${file}`);
  }
  const content = Fs.readFileSync(file, 'utf8');
  const format = detectFormat(file, content);
  const packages = format === 'pnpm' ? parsePnpm(content) : parseYarn(content);
  return { file, format, packages };
}

function detectFormat(file: string, content: string): LockFormat {
  if (file.endsWith('.yaml') || file.endsWith('.yml')) return 'pnpm';
  if (/^lockfileVersion:/m.test(content)) return 'pnpm';
  return 'yarn';
}

/** Every snapshot key in a pnpm lock is a resolved `name@version` (peer suffix stripped). */
function parsePnpm(content: string): PackageMap {
  const packages: PackageMap = new Map();
  const lock = parseLockfile(content);
  for (const key of Object.keys(lock.snapshots)) {
    const { name, version } = snapshotKeyToNameVersion(key);
    if (name && version) addPackage(packages, name, version);
  }
  return packages;
}

/** yarn.lock v1: blocks keyed by specifiers, each with a `version "x"` line. */
function parseYarn(content: string): PackageMap {
  const packages: PackageMap = new Map();
  for (const block of content.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/);
    const header = lines.find((l) => l && !l.startsWith('#') && l.trimEnd().endsWith(':'));
    const versionLine = lines.find((l) => /^\s+version:?\s+"/.test(l));
    if (!header || !versionLine) continue;

    const name = nameFromYarnSpecifier(header);
    const version = versionLine.match(/version:?\s+"([^"]+)"/)![1];
    if (name) addPackage(packages, name, version);
  }
  return packages;
}

function nameFromYarnSpecifier(header: string): string {
  const first = header.split(',')[0].trim().replace(/:$/, '').replace(/^"|"$/g, '');
  // The name ends at the `@` that introduces the range (skip a leading scope `@`).
  const at = first.indexOf('@', first.startsWith('@') ? 1 : 0);
  return at === -1 ? first : first.slice(0, at);
}

function addPackage(packages: PackageMap, name: string, version: string): void {
  if (!packages.has(name)) packages.set(name, new Set());
  packages.get(name)!.add(version);
}

interface Summary {
  file: string;
  format: LockFormat;
  names: number;
  resolutions: number;
  multiVersion: number;
}

function summarize(lock: Lock): Summary {
  let resolutions = 0;
  let multiVersion = 0;
  for (const versions of lock.packages.values()) {
    resolutions += versions.size;
    if (versions.size > 1) multiVersion += 1;
  }
  return {
    file: rel(lock.file),
    format: lock.format,
    names: lock.packages.size,
    resolutions,
    multiVersion,
  };
}

function nameVersions(lock: Lock): string[] {
  const out: string[] = [];
  for (const [name, versions] of lock.packages) {
    for (const version of versions) out.push(`${name}@${version}`);
  }
  return out.sort();
}

function reportSingle(lock: Lock, flags: Flags): number {
  const stats = summarize(lock);
  if (flags.json) {
    print(
      JSON.stringify({ ...stats, versions: flags.list ? nameVersions(lock) : undefined }, null, 2)
    );
    return 0;
  }
  print(`${rel(lock.file)}  [${lock.format}]`);
  print(`  distinct packages (name):        ${stats.names}`);
  print(`  distinct resolutions (name@ver): ${stats.resolutions}`);
  print(`  names with multiple versions:    ${stats.multiVersion}`);
  if (flags.list) {
    print('');
    for (const nv of nameVersions(lock)) print(`  ${nv}`);
  }
  return 0;
}

interface Diff {
  a: Summary;
  b: Summary;
  sharedNames: number;
  namesOnlyInA: string[];
  namesOnlyInB: string[];
  versionDrift: Array<{ name: string; a: string[]; b: string[] }>;
  extraInA: string[];
  extraInB: string[];
}

function diffLocks(a: Lock, b: Lock): Diff {
  const namesA = new Set(a.packages.keys());
  const namesB = new Set(b.packages.keys());
  const nvA = new Set(nameVersions(a));
  const nvB = new Set(nameVersions(b));

  const versionDrift: Diff['versionDrift'] = [];
  for (const name of namesA) {
    if (!namesB.has(name)) continue;
    const va = [...a.packages.get(name)!].sort();
    const vb = [...b.packages.get(name)!].sort();
    if (va.join() !== vb.join()) versionDrift.push({ name, a: va, b: vb });
  }

  return {
    a: summarize(a),
    b: summarize(b),
    sharedNames: [...namesA].filter((n) => namesB.has(n)).length,
    namesOnlyInA: [...namesA].filter((n) => !namesB.has(n)).sort(),
    namesOnlyInB: [...namesB].filter((n) => !namesA.has(n)).sort(),
    versionDrift: versionDrift.sort((x, y) => x.name.localeCompare(y.name)),
    extraInA: [...nvA].filter((nv) => !nvB.has(nv)).sort(),
    extraInB: [...nvB].filter((nv) => !nvA.has(nv)).sort(),
  };
}

function reportDiff(a: Lock, b: Lock, flags: Flags): number {
  const diff = diffLocks(a, b);
  if (flags.json) {
    print(JSON.stringify(diff, null, 2));
    return 0;
  }

  print(`A: ${rel(a.file)}  [${a.format}]`);
  print(`B: ${rel(b.file)}  [${b.format}]`);
  print('');
  print('Totals');
  print(`  A: ${diff.a.resolutions} resolutions across ${diff.a.names} packages`);
  print(`  B: ${diff.b.resolutions} resolutions across ${diff.b.names} packages`);
  print('');
  print('Package presence (by name)');
  print(`  only in A: ${diff.namesOnlyInA.length}`);
  print(`  only in B: ${diff.namesOnlyInB.length}`);
  print(`  shared:    ${diff.sharedNames}`);
  print(`  version drift (shared name, differing versions): ${diff.versionDrift.length}`);
  print('');
  print('Resolution presence (by name@version)');
  print(`  extra in A: ${diff.extraInA.length}`);
  print(`  extra in B: ${diff.extraInB.length}`);

  if (!flags.quiet) {
    printList('Packages only in A', diff.namesOnlyInA);
    printList('Packages only in B', diff.namesOnlyInB);
    printList(
      'Version drift (name: A-versions | B-versions)',
      diff.versionDrift.map((d) => `${d.name}: ${d.a.join(', ')} | ${d.b.join(', ')}`)
    );
  }
  return 0;
}

function printList(title: string, items: string[]): void {
  if (items.length === 0) return;
  print('');
  print(`${title} (${items.length}):`);
  for (const item of items) print(`  ${item}`);
}

function rel(file: string): string {
  const r = Path.relative(REPO_ROOT, file);
  return r.startsWith('..') ? file : r;
}

function print(line: string): void {
  process.stdout.write(`${line}\n`);
}

try {
  process.exitCode = runLockfileVersions(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
}
