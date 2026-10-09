/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Fsp from 'fs/promises';
import { cpus } from 'os';
import Path from 'path';

import { parseSync } from '@swc/core';
import { build as esbuild, type Plugin } from 'esbuild';
import { asyncForEachWithLimit } from '@kbn/std';

import type { Task } from '../lib';

const FUNCTION_NODES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ClassMethod',
  'MethodProperty',
  'Constructor',
  'GetterProperty',
  'SetterProperty',
  'PrivateMethod',
  'PrivateGetter',
  'PrivateSetter',
]);

/**
 * Bundle each plugin's `server/plugin.js` startup graph.
 *
 * Runs after `CreatePackageJson`. That task walks each `server/index.js` graph to
 * decide which packages to install. The import scanner drops `require()` calls
 * inside the esbuild bundle, so bundling first omits packages such as
 * `@kbn/inference-langchain`.
 */
export const BundlePluginServers: Task = {
  description: 'Bundling plugin server startup graphs',

  async run(config, log, build) {
    const plugins = config.getDistPluginsFromRepo();
    log.info(`Bundling server startup graphs for ${plugins.length} plugins`);

    await asyncForEachWithLimit(plugins, cpus().length, async (pkg) => {
      await bundlePluginServer(build.resolvePath(pkg.normalizedRepoRelativeDir));
    });
  },
};

/**
 * Replace `server/plugin.js` with one CommonJS bundle of the files that only
 * that entry loads. Packages, lazy requires, and modules also required from outside
 * the bundle stay as separate files so Node loads a single instance of each.
 */
export async function bundlePluginServer(pkgDistPath: string): Promise<void> {
  const packageRoot = Fs.realpathSync(pkgDistPath);
  const entry = Path.resolve(packageRoot, 'server', 'plugin.js');
  if (!Fs.existsSync(entry)) {
    return;
  }

  const closure = collectInlineGraph(entry, packageRoot);
  // A single file has no local import walk to collapse.
  if (closure.size < 2) {
    return;
  }

  const outfile = Path.resolve(packageRoot, 'server', 'plugin.bundle.js');
  const serverDir = Path.dirname(entry);

  try {
    await esbuild({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile,
      minify: false,
      treeShaking: false,
      keepNames: true,
      legalComments: 'inline',
      logLevel: 'silent',
      absWorkingDir: packageRoot,
      // Captures the real directory of server/plugin.js. Per-file __dirname
      // values are resolved from this at runtime so the bundle still works
      // after the distributable is moved off the build machine.
      banner: { js: 'var __kbnBundleDirname = __dirname;\n' },
      plugins: [pluginServerBundlePlugin(closure, serverDir)],
    });
    await Fsp.rename(outfile, entry);
  } catch (error) {
    await Fsp.rm(outfile, { force: true });
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to bundle server plugin at ${entry}: ${message}`);
  }
}

function pluginServerBundlePlugin(closure: Set<string>, serverDir: string): Plugin {
  return {
    name: 'plugin-server-bundle',
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === 'entry-point') {
          return null;
        }
        if (!args.path.startsWith('.')) {
          return { path: args.path, external: true };
        }

        const resolved = resolveExisting(args.resolveDir, args.path);
        if (resolved && closure.has(resolved)) {
          return { path: resolved };
        }

        const expected = resolved ?? Path.resolve(args.resolveDir, args.path);
        return { path: relativeSpecifier(serverDir, expected), external: true };
      });

      pluginBuild.onLoad({ filter: /\.js$/ }, async (args) => {
        const filename = Fs.realpathSync(args.path);
        const source = await Fsp.readFile(filename, 'utf8');
        return {
          loader: 'js',
          resolveDir: Path.dirname(filename),
          contents: injectModulePaths(source, filename, serverDir),
        };
      });
    },
  };
}

function collectInlineGraph(entry: string, packageRoot: string): Set<string> {
  const startup = collectStartupGraph(entry, packageRoot);
  if (startup.size < 2) {
    return startup;
  }
  return excludeSharedModules(startup, entry, packageRoot);
}

/**
 * Drop modules that a file outside the bundle can require. Their on-disk copy
 * would be a second instance, so the bundle require()s them instead.
 */
function excludeSharedModules(
  inline: Set<string>,
  entry: string,
  packageRoot: string
): Set<string> {
  const requiresByFile = new Map<string, readonly string[]>();
  const requireTargets = (file: string): readonly string[] => {
    const cached = requiresByFile.get(file);
    if (cached) {
      return cached;
    }

    const targets: string[] = [];
    for (const specifier of requireSpecifiers(Fs.readFileSync(file, 'utf8'), file, false)) {
      if (!specifier.startsWith('.')) {
        continue;
      }
      const resolved = resolveExisting(Path.dirname(file), specifier);
      if (resolved && Path.extname(resolved) === '.js' && isInside(packageRoot, resolved)) {
        targets.push(resolved);
      }
    }
    requiresByFile.set(file, targets);
    return targets;
  };

  const queue = listPackageJsFiles(packageRoot).filter((file) => !inline.has(file));
  const seen = new Set(queue);

  for (let index = 0; index < queue.length; index++) {
    const file = queue[index];
    if (!file) {
      continue;
    }
    for (const target of requireTargets(file)) {
      if (target === entry || !inline.has(target)) {
        continue;
      }
      inline.delete(target);
      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }

  return inline;
}

function listPackageJsFiles(packageRoot: string): string[] {
  const files: string[] = [];
  const seen = new Set<string>();

  const visit = (dir: string) => {
    for (const entry of Fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') {
        continue;
      }
      const abs = Path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(abs);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.js') || entry.name === 'plugin.bundle.js') {
        continue;
      }
      const real = Fs.realpathSync(abs);
      if (!seen.has(real) && isInside(packageRoot, real)) {
        seen.add(real);
        files.push(real);
      }
    }
  };

  visit(packageRoot);
  return files;
}

function collectStartupGraph(entry: string, packageRoot: string): Set<string> {
  const closure = new Set<string>();

  const visit = (file: string) => {
    const abs = Fs.realpathSync(file);
    if (closure.has(abs) || Path.extname(abs) !== '.js' || !isInside(packageRoot, abs)) {
      return;
    }
    closure.add(abs);

    let code: string;
    try {
      code = Fs.readFileSync(abs, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read ${abs} while bundling the server plugin: ${message}`);
    }

    for (const specifier of requireSpecifiers(code, abs, true)) {
      if (!specifier.startsWith('.')) {
        continue;
      }
      const resolved = resolveExisting(Path.dirname(abs), specifier);
      if (resolved) {
        visit(resolved);
      }
    }
  };

  visit(entry);
  return closure;
}

function requireSpecifiers(code: string, filename: string, topLevelOnly: boolean): string[] {
  let body: unknown;
  try {
    body = parseSync(code, { syntax: 'ecmascript' }).body;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${filename} while bundling the server plugin: ${message}`);
  }

  const specifiers: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }

    const record = node as {
      type?: string;
      callee?: { type?: string; value?: string };
      arguments?: Array<{ expression?: { type?: string; value?: string } }>;
    };
    if (topLevelOnly && record.type && FUNCTION_NODES.has(record.type)) {
      return;
    }
    if (
      record.type === 'CallExpression' &&
      record.callee?.type === 'Identifier' &&
      record.callee.value === 'require'
    ) {
      const arg = record.arguments?.[0]?.expression;
      if (arg?.type === 'StringLiteral' && arg.value) {
        specifiers.push(arg.value);
      }
      return;
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') visit(value);
    }
  };

  visit(body);
  return specifiers;
}

function resolveExisting(resolveDir: string, specifier: string): string | null {
  for (const candidate of candidatePaths(resolveDir, specifier)) {
    if (Fs.existsSync(candidate) && Fs.statSync(candidate).isFile()) {
      return Fs.realpathSync(candidate);
    }
  }
  return null;
}

function candidatePaths(resolveDir: string, specifier: string): string[] {
  // Follow Node's LOAD_AS_FILE order. `Path.extname("./8.9.0")` is `.0`, so a
  // specifier can look extended and still need `.js` appended.
  const base = Path.resolve(resolveDir, specifier);
  return [
    base,
    `${base}.js`,
    `${base}.json`,
    `${base}.node`,
    Path.join(base, 'index.js'),
    Path.join(base, 'index.json'),
  ];
}

function relativeSpecifier(fromDir: string, target: string): string {
  let relative = Path.relative(fromDir, target).split(Path.sep).join('/');
  if (!relative.startsWith('.')) {
    relative = `./${relative}`;
  }
  return relative;
}

function injectModulePaths(source: string, filename: string, serverDir: string): string {
  const relativeFile = Path.relative(serverDir, filename).split(Path.sep).join('/');
  const relativeDir = Path.posix.dirname(relativeFile);
  // Join against the bundle's own __dirname. A path baked in at build time
  // points at the build workspace, which is gone when CI runs the distributable.
  const injected = `var __filename = require("path").join(__kbnBundleDirname, ${JSON.stringify(
    relativeFile
  )});\nvar __dirname = require("path").join(__kbnBundleDirname, ${JSON.stringify(
    relativeDir
  )});\n`;
  const directive = source.match(/^(?:\s|\/\*[\s\S]*?\*\/|\/\/.*\n)*["']use strict["'];?\n?/);
  if (!directive) {
    return injected + source;
  }
  return source.slice(0, directive[0].length) + injected + source.slice(directive[0].length);
}

function isInside(root: string, file: string): boolean {
  const relative = Path.relative(root, file);
  return relative === '' || (!relative.startsWith('..') && !Path.isAbsolute(relative));
}
