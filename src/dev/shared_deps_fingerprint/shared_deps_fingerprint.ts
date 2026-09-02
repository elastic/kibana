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
import { builtinModules, createRequire } from 'module';

import { parse as parseYaml } from 'yaml';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Prints `name@version` for every node_module a shared bundle ends up containing, so Moon can
 * mix it into the task hash as a `fingerprint` check. Roots are the bare import specifiers found
 * in the task's own source inputs (from moon.yml) and webpack entries; the set is then closed over
 * `dependencies`/`optionalDependencies` by walking `node_modules` with node's resolution rules.
 */
export function runCli() {
  return run(
    async ({ flagsReader }) => {
      const lines = collectSharedDepsFingerprint({
        moonProjects: flagsReader.arrayOfStrings('moon-project') ?? [],
        webpackConfigs: flagsReader.arrayOfStrings('webpack-config') ?? [],
        packages: flagsReader.arrayOfStrings('package') ?? [],
      });
      process.stdout.write(lines.join('\n') + '\n');
    },
    {
      description: 'Fingerprint the node_modules bundled by a shared webpack build',
      usage:
        'node scripts/shared_deps_fingerprint --moon-project <dir> [--webpack-config <path>] [--package <name>]...',
      flags: {
        string: ['moon-project', 'webpack-config', 'package'],
        help: `
          --moon-project     project dir; source files matched by its build-webpack task inputs are scanned for imports
          --webpack-config   webpack config to load; bare entry specifiers become roots, local entry files get scanned
          --package          extra root package (e.g. loaders referenced by name only)
        `,
      },
    }
  );
}

interface FingerprintOptions {
  moonProjects: string[];
  webpackConfigs: string[];
  packages: string[];
  repoRoot?: string;
  taskName?: string;
}

export function collectSharedDepsFingerprint({
  moonProjects,
  webpackConfigs,
  packages,
  repoRoot = REPO_ROOT,
  taskName = 'build-webpack',
}: FingerprintOptions): string[] {
  const roots = new Set(packages);
  const files: string[] = [];

  for (const projectDir of moonProjects) {
    files.push(...moonTaskInputFiles(Path.resolve(repoRoot, projectDir), taskName, repoRoot));
  }

  for (const configPath of webpackConfigs) {
    const absConfig = Path.resolve(repoRoot, configPath);
    for (const specifier of webpackEntrySpecifiers(absConfig)) {
      if (isBareSpecifier(specifier)) {
        roots.add(packageNameOf(specifier));
      } else {
        files.push(Path.resolve(Path.dirname(absConfig), specifier));
      }
    }
  }

  for (const file of new Set(files)) {
    for (const specifier of importSpecifiers(file)) {
      if (isBareSpecifier(specifier) && !specifier.startsWith('@kbn/')) {
        roots.add(packageNameOf(specifier));
      }
    }
  }

  return resolveTransitiveVersions(roots, repoRoot);
}

const SPECIFIER_RE =
  /(?:\brequire(?:\.resolve)?\(|\bimport\(|^\s*(?:import|export)\b[^'"`;]*?\bfrom|^\s*import|\bloader:)\s*['"]([^'"\n]+)['"]/gm;
const SOURCE_EXT = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx']);
const SKIP_DIRS = new Set(['node_modules', 'target', '__fixtures__', '__snapshots__', '__mocks__']);
const SKIP_FILE_RE = /\.(test|stories|mock|mocks)\.[cm]?[jt]sx?$|\.d\.ts$/;

/** Source files covered by a task's `inputs` (resolving `@group(...)`), which is what the bundle is built from. */
function moonTaskInputFiles(projectDir: string, taskName: string, repoRoot: string): string[] {
  const moonYml = parseYaml(Fs.readFileSync(Path.join(projectDir, 'moon.yml'), 'utf8'));
  const inputs: string[] = moonYml.tasks?.[taskName]?.inputs ?? [];
  const patterns = inputs.flatMap((input) => {
    const group = input.match(/^@group\((\w+)\)$/);
    return group ? moonYml.fileGroups?.[group[1]] ?? [] : [input];
  });

  return patterns.flatMap((pattern: string) => {
    if (pattern.startsWith('!')) {
      return [];
    }
    // ponytail: globs are approximated by their static dir prefix + our source extension filter,
    // which matches the `dir/**/*.{js,ts,tsx}` shape used by these tasks. Upgrade: fast-glob.
    const segments = pattern.split('/');
    const firstMagic = segments.findIndex((seg) => /[*{?]/.test(seg));
    const magic = firstMagic !== -1;
    const base = pattern.startsWith('/') ? repoRoot : projectDir;
    const abs = Path.join(base, ...(magic ? segments.slice(0, firstMagic) : segments));
    if (!Fs.existsSync(abs)) {
      return [];
    }
    if (magic || Fs.statSync(abs).isDirectory()) {
      return listSourceFiles(abs);
    }
    return SOURCE_EXT.has(Path.extname(abs)) ? [abs] : [];
  });
}

function listSourceFiles(dir: string): string[] {
  return Fs.readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => Path.join(entry.parentPath, entry.name))
    .filter(
      (file) =>
        SOURCE_EXT.has(Path.extname(file)) &&
        !SKIP_FILE_RE.test(file) &&
        !Path.relative(dir, file)
          .split(Path.sep)
          .some((segment) => SKIP_DIRS.has(segment))
    );
}

function importSpecifiers(file: string): string[] {
  if (!Fs.existsSync(file)) {
    return [];
  }
  return [...Fs.readFileSync(file, 'utf8').matchAll(SPECIFIER_RE)].map((match) => match[1]);
}

/** Closes the root set over dependencies/optionalDependencies using node's resolution rules. */
function resolveTransitiveVersions(roots: Set<string>, repoRoot: string): string[] {
  const lines = new Set<string>();
  const visited = new Set<string>();
  const queue = [...roots].map((name) => ({ name, fromDir: repoRoot, optional: false }));

  for (let next = queue.pop(); next; next = queue.pop()) {
    const { name, fromDir, optional } = next;
    const pkgDir = resolvePackageDir(name, fromDir);
    if (!pkgDir) {
      if (!optional && !builtinModules.includes(name)) {
        process.stderr.write(`shared_deps_fingerprint: cannot resolve ${name} from ${fromDir}\n`);
      }
      continue;
    }
    if (visited.has(pkgDir)) {
      continue;
    }
    visited.add(pkgDir);

    const pkg = JSON.parse(Fs.readFileSync(Path.join(pkgDir, 'package.json'), 'utf8'));
    lines.add(`${name}@${pkg.version}`);

    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      queue.push({ name: dep, fromDir: pkgDir, optional: false });
    }
    for (const dep of Object.keys(pkg.optionalDependencies ?? {})) {
      queue.push({ name: dep, fromDir: pkgDir, optional: true });
    }
  }

  return [...lines].sort((a, b) => a.localeCompare(b));
}

/** Node-style lookup of `<dir>/node_modules/<name>` walking up from `fromDir`; returns the realpath. */
function resolvePackageDir(name: string, fromDir: string): string | undefined {
  let dir = fromDir;
  while (true) {
    const candidate = Path.join(dir, 'node_modules', name);
    if (Fs.existsSync(Path.join(candidate, 'package.json'))) {
      return Fs.realpathSync(candidate);
    }
    const parent = Path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

function webpackEntrySpecifiers(configPath: string): string[] {
  const loaded = createRequire(configPath)(configPath);
  const config = typeof loaded === 'function' ? loaded({}, {}) : loaded;
  return Object.values(config.entry ?? {}).flat() as string[];
}

function isBareSpecifier(specifier: string): boolean {
  return !/^(\.|\/|node:|!|[a-zA-Z]:\\)/.test(specifier);
}

function packageNameOf(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}
