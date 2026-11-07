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

const SHORT_CIRCUIT_OPERATORS = new Set(['&&', '||', '??']);

/**
 * V8 keeps a script's source in large-object space once it reaches 128 KiB,
 * and that space is not compacted. Stay under it after esbuild's wrappers and
 * the injected `__dirname` lines. A single file, or a require cycle, larger
 * than the budget is emitted as its own chunk and may still cross 128 KiB.
 */
const CHUNK_SOURCE_BUDGET = 96 * 1024;

const BUNDLE_BANNER = 'var __kbnBundleDirname = __dirname;\n';

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
 * Replace `server/plugin.js` with a CommonJS bundle of the files that only
 * that entry loads. Packages, conditional branches, lazy requires, and modules
 * also required from outside the bundle stay as separate files so Node loads a
 * single instance of each. The eager graph is split into chunks that stay
 * under V8's large-object threshold.
 */
export async function bundlePluginServer(pkgDistPath: string): Promise<void> {
  const packageRoot = Fs.realpathSync(pkgDistPath);
  const entry = Path.resolve(packageRoot, 'server', 'plugin.js');
  if (!Fs.existsSync(entry)) {
    return;
  }

  const entryReal = Fs.realpathSync(entry);
  const closure = collectInlineGraph(entryReal, packageRoot);
  // A single file has no local import walk to collapse.
  if (closure.size < 2) {
    return;
  }

  const serverDir = Path.dirname(entry);
  const chunks = packChunks(entryReal, closure);
  const moduleChunk = new Map<string, string>();
  chunks.forEach((modules, index) => {
    const filename = chunkFilename(index);
    for (const file of modules) {
      moduleChunk.set(file, filename);
    }
  });

  const written: string[] = [];
  try {
    for (let index = 0; index < chunks.length; index++) {
      const modules = chunks[index];
      if (!modules) {
        continue;
      }
      const filename = chunkFilename(index);
      const outfile = Path.resolve(serverDir, index === 0 ? 'plugin.bundle.js' : filename);
      written.push(outfile);
      await buildChunk({
        outfile,
        packageRoot,
        serverDir,
        chunkModules: new Set(modules),
        moduleChunk,
        chunkFilename: filename,
        entry: index === 0 ? entryReal : undefined,
        modules: index === 0 ? undefined : modules,
      });
    }
    await Fsp.rename(Path.resolve(serverDir, 'plugin.bundle.js'), entry);
  } catch (error) {
    await Promise.all(written.map((file) => Fsp.rm(file, { force: true })));
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to bundle server plugin at ${entry}: ${message}`);
  }
}

interface BuildChunkOptions {
  outfile: string;
  packageRoot: string;
  serverDir: string;
  chunkModules: Set<string>;
  moduleChunk: Map<string, string>;
  chunkFilename: string;
  entry: string | undefined;
  modules: string[] | undefined;
}

async function buildChunk(options: BuildChunkOptions): Promise<void> {
  const plugin = pluginServerBundlePlugin(options);
  const shared = {
    bundle: true,
    platform: 'node' as const,
    format: 'cjs' as const,
    outfile: options.outfile,
    minify: false,
    treeShaking: false,
    // Screenshotting stringifies nested functions into the page. keepNames
    // inserts a Node-only `__name` helper into those bodies, so the browser
    // throws `ReferenceError: __name is not defined` during render.
    keepNames: false,
    legalComments: 'inline' as const,
    logLevel: 'silent' as const,
    absWorkingDir: options.packageRoot,
    // Captures the real directory of the chunk, which lives next to plugin.js.
    // Per-file __dirname values are resolved from this at runtime so the bundle
    // still works after the distributable is moved off the build machine.
    banner: { js: BUNDLE_BANNER },
    plugins: [plugin],
  };

  if (options.entry) {
    await esbuild({ ...shared, entryPoints: [options.entry] });
    // A cycle makes esbuild evaluate the entry into its own exports object and
    // assign `module.exports` only after that call returns. An on-disk file
    // required in the middle still holds Node's empty object. Point the wrapper
    // at Node's module before the call so those writes are visible immediately.
    publishEntryExports(options.outfile);
    return;
  }

  await esbuild({
    ...shared,
    stdin: {
      contents: virtualChunkEntry(options.modules ?? [], options.serverDir),
      resolveDir: options.serverDir,
      sourcefile: 'virtual-chunk-entry',
      loader: 'js',
    },
  });
}

// esbuild 0.28 wraps a cyclic entry in this helper and fills a fresh `{ exports }`
// until the trailing `module.exports = require_plugin()` call.
const ESBUILD_COMMONJS_HELPER =
  'var __commonJS = (cb, mod) => function __require() {\n' +
  '  try {\n' +
  '    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;\n' +
  '  } catch (e) {\n' +
  '    throw mod = 0, e;\n' +
  '  }\n' +
  '};';

const ESBUILD_COMMONJS_HELPER_WITH_EXISTING_MODULE =
  'var __commonJS = (cb, mod) => function __require(existing) {\n' +
  '  try {\n' +
  '    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = existing || { exports: {} }).exports, mod), mod.exports;\n' +
  '  } catch (e) {\n' +
  '    throw mod = 0, e;\n' +
  '  }\n' +
  '};';

function publishEntryExports(outfile: string): void {
  const source = Fs.readFileSync(outfile, 'utf8');
  // Without a cycle the entry writes onto Node's `exports` directly.
  const match = source.match(/module\.exports = (require_[A-Za-z0-9_$]+)\(\);\s*$/);
  if (!match || match.index === undefined || !match[1]) {
    return;
  }

  if (!source.includes(ESBUILD_COMMONJS_HELPER)) {
    throw new Error(
      `Failed to bundle server plugin at ${outfile}: esbuild's cyclic entry wrapper did not match the expected helper`
    );
  }

  const requireEntry = match[1];
  const rewritten =
    source
      .slice(0, match.index)
      .replace(ESBUILD_COMMONJS_HELPER, ESBUILD_COMMONJS_HELPER_WITH_EXISTING_MODULE) +
    `module.exports = ${requireEntry}(module);\n`;
  Fs.writeFileSync(outfile, rewritten);
}

function virtualChunkEntry(modules: readonly string[], serverDir: string): string {
  // Getters evaluate one module on first access. An object of eager requires
  // would run every sibling when any one of them is loaded.
  const loaded = 'var __kbnChunkLoaded = Object.create(null);';
  const getters = modules.map((file) => {
    const key = JSON.stringify(relativeKey(serverDir, file));
    const specifier = JSON.stringify(relativeSpecifier(serverDir, file));
    return [
      `  get ${key}() {`,
      `    if (!Object.prototype.hasOwnProperty.call(__kbnChunkLoaded, ${key})) {`,
      `      __kbnChunkLoaded[${key}] = require(${specifier});`,
      '    }',
      `    return __kbnChunkLoaded[${key}];`,
      '  }',
    ].join('\n');
  });
  return `"use strict";\n${loaded}\nmodule.exports = {\n${getters.join(',\n')}\n};\n`;
}

function pluginServerBundlePlugin(options: BuildChunkOptions): Plugin {
  const { chunkModules, serverDir, moduleChunk, chunkFilename: ownChunk } = options;
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

        // require.resolve() needs a path on disk. Inlining the target leaves
        // the relative call resolving against server/ and throws MODULE_NOT_FOUND.
        if (args.kind === 'require-resolve') {
          const resolvedForDisk = resolveExisting(args.resolveDir, args.path);
          const expected = resolvedForDisk ?? Path.resolve(args.resolveDir, args.path);
          return { path: relativeSpecifier(serverDir, expected), external: true };
        }

        const resolved = resolveExisting(args.resolveDir, args.path);
        if (resolved && chunkModules.has(resolved)) {
          return { path: resolved };
        }

        const expected = resolved ?? Path.resolve(args.resolveDir, args.path);
        return { path: relativeSpecifier(serverDir, expected), external: true };
      });

      pluginBuild.onLoad({ filter: /\.js$/ }, async (args) => {
        let filename: string;
        try {
          filename = Fs.realpathSync(args.path);
        } catch {
          return undefined;
        }
        if (!chunkModules.has(filename)) {
          return undefined;
        }
        const source = await Fsp.readFile(filename, 'utf8');
        const rewritten = rewriteCrossChunkRequires(
          source,
          filename,
          serverDir,
          ownChunk,
          moduleChunk
        );
        return {
          loader: 'js',
          resolveDir: Path.dirname(filename),
          contents: injectModulePaths(rewritten, filename, serverDir),
        };
      });
    },
  };
}

/**
 * Split the eager graph so each emitted script stays under the large-object
 * threshold. Requires that cross a chunk boundary point at a later chunk:
 * a module is placed only after every file that requires it, and cycles stay
 * in one chunk, so chunks never require each other in a circle.
 */
function packChunks(entry: string, inline: Set<string>): string[][] {
  const deps = new Map<string, string[]>();
  for (const file of inline) {
    deps.set(file, chunkDependencies(file, inline));
  }

  const sccs = stronglyConnectedComponents(inline, deps);
  const sccOf = new Map<string, number>();
  sccs.forEach((files, index) => {
    for (const file of files) sccOf.set(file, index);
  });

  const sccDeps: number[][] = sccs.map(() => []);
  const incoming = sccs.map(() => 0);
  const seenEdges = new Set<string>();
  for (const [from, targets] of deps) {
    const fromScc = sccOf.get(from);
    if (fromScc === undefined) {
      continue;
    }
    for (const target of targets) {
      const toScc = sccOf.get(target);
      if (toScc === undefined || toScc === fromScc) {
        continue;
      }
      const edge = `${fromScc}>${toScc}`;
      if (seenEdges.has(edge)) {
        continue;
      }
      seenEdges.add(edge);
      sccDeps[fromScc]?.push(toScc);
      incoming[toScc] = (incoming[toScc] ?? 0) + 1;
    }
  }

  const entryScc = sccOf.get(entry) ?? 0;
  const ready = [entryScc];
  const placed = new Set<number>();
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentSize = 0;

  const flush = () => {
    if (current.length === 0) {
      return;
    }
    chunks.push(current);
    current = [];
    currentSize = 0;
  };

  const place = (sccIndex: number) => {
    if (placed.has(sccIndex)) {
      return;
    }
    placed.add(sccIndex);
    const files = sccs[sccIndex] ?? [];
    const size = files.reduce((sum, file) => sum + Fs.statSync(file).size, 0);
    if (current.length > 0 && currentSize + size > CHUNK_SOURCE_BUDGET) {
      flush();
    }
    current.push(...files);
    currentSize += size;
    if (currentSize >= CHUNK_SOURCE_BUDGET) {
      flush();
    }
    for (const next of sccDeps[sccIndex] ?? []) {
      incoming[next] = (incoming[next] ?? 1) - 1;
      if (incoming[next] === 0) {
        ready.push(next);
      }
    }
  };

  while (ready.length > 0) {
    const next = ready.shift();
    if (next !== undefined) {
      place(next);
    }
  }
  flush();

  for (let index = 0; index < sccs.length; index++) {
    if (!placed.has(index)) {
      chunks.push(sccs[index] ?? []);
    }
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

function chunkDependencies(file: string, inline: Set<string>): string[] {
  const targets: string[] = [];
  let code: string;
  try {
    code = Fs.readFileSync(file, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read ${file} while bundling the server plugin: ${message}`);
  }

  // Every static require of an inlined module, including ones inside functions
  // and branches. The target has to live in this file's chunk or a later one
  // so the rewritten require and the eager require share one instance.
  for (const call of collectRequireCalls(code, file, false)) {
    if (!call.specifier.startsWith('.')) {
      continue;
    }
    const resolved = resolveExisting(Path.dirname(file), call.specifier);
    if (resolved && inline.has(resolved)) {
      targets.push(resolved);
    }
  }
  return targets;
}

function stronglyConnectedComponents(
  nodes: Set<string>,
  deps: Map<string, readonly string[]>
): string[][] {
  const reverse = new Map<string, string[]>();
  for (const node of nodes) {
    reverse.set(node, []);
  }
  for (const [from, targets] of deps) {
    for (const target of targets) {
      if (reverse.has(target)) {
        reverse.get(target)?.push(from);
      }
    }
  }

  const visited = new Set<string>();
  const order: string[] = [];
  for (const start of nodes) {
    if (visited.has(start)) {
      continue;
    }
    const stack: Array<{ node: string; childIndex: number }> = [{ node: start, childIndex: 0 }];
    visited.add(start);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (!frame) {
        break;
      }
      const children = deps.get(frame.node) ?? [];
      if (frame.childIndex < children.length) {
        const child = children[frame.childIndex];
        frame.childIndex++;
        if (child && !visited.has(child) && deps.has(child)) {
          visited.add(child);
          stack.push({ node: child, childIndex: 0 });
        }
      } else {
        order.push(frame.node);
        stack.pop();
      }
    }
  }

  const seen = new Set<string>();
  const components: string[][] = [];
  for (let index = order.length - 1; index >= 0; index--) {
    const start = order[index];
    if (!start || seen.has(start)) {
      continue;
    }
    const component: string[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) {
        continue;
      }
      component.push(node);
      for (const next of reverse.get(node) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    components.push(component);
  }
  return components;
}

function chunkFilename(index: number): string {
  return index === 0 ? 'plugin.js' : `plugin.chunk-${index}.js`;
}

function rewriteCrossChunkRequires(
  source: string,
  filename: string,
  serverDir: string,
  ownChunk: string,
  moduleChunk: Map<string, string>
): string {
  const replacements: Array<{ start: number; end: number; text: string }> = [];
  for (const call of collectRequireCalls(source, filename, false)) {
    if (!call.specifier.startsWith('.')) {
      continue;
    }
    const resolved = resolveExisting(Path.dirname(filename), call.specifier);
    const targetChunk = resolved ? moduleChunk.get(resolved) : undefined;
    if (!resolved || !targetChunk || targetChunk === ownChunk) {
      continue;
    }
    const specifier = relativeSpecifier(
      Path.dirname(filename),
      Path.resolve(serverDir, targetChunk)
    );
    const key = relativeKey(serverDir, resolved);
    replacements.push({
      start: call.start,
      end: call.end,
      text: `require(${JSON.stringify(specifier)})[${JSON.stringify(key)}]`,
    });
  }
  return applyReplacements(source, replacements);
}

function applyReplacements(
  source: string,
  replacements: ReadonlyArray<{ start: number; end: number; text: string }>
): string {
  if (replacements.length === 0) {
    return source;
  }
  const bytes = Buffer.from(source);
  const pieces: Buffer[] = [];
  let cursor = 0;
  for (const replacement of [...replacements].sort((a, b) => a.start - b.start)) {
    pieces.push(bytes.subarray(cursor, replacement.start));
    pieces.push(Buffer.from(replacement.text));
    cursor = replacement.end;
  }
  pieces.push(bytes.subarray(cursor));
  return Buffer.concat(pieces).toString('utf8');
}

function collectInlineGraph(entry: string, packageRoot: string): Set<string> {
  const startup = collectStartupGraph(entry, packageRoot);
  if (startup.size < 2) {
    return startup;
  }
  const inline = excludeSharedModules(startup, entry, packageRoot);
  // A second pass picks up relative requires of files that another package
  // loads by name, which the first pass could not see.
  if (excludeCrossPackageModules(inline, entry, packageRoot)) {
    return excludeSharedModules(inline, entry, packageRoot);
  }
  return inline;
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

const crossPackageRequiredFilesCache = new Map<string, ReadonlyMap<string, ReadonlySet<string>>>();

/**
 * Drop modules that another package require()s by name, such as
 * `@kbn/lists-plugin/server/exception_item_import_error`. The same-package
 * scan never sees that specifier, so inlining the file creates a second class
 * and `instanceof` checks fail.
 *
 * @returns whether any module was removed from the inline set
 */
function excludeCrossPackageModules(
  inline: Set<string>,
  entry: string,
  packageRoot: string
): boolean {
  const required = crossPackageRequiredFiles(packageRoot);
  let removed = false;
  for (const file of required) {
    if (file !== entry && inline.delete(file)) {
      removed = true;
    }
  }
  return removed;
}

function crossPackageRequiredFiles(packageRoot: string): ReadonlySet<string> {
  // Packages are still at their repo paths under the kibana build root.
  // pnpm copies them into node_modules only after this task.
  const scanRoot = kibanaBuildRoot(packageRoot);
  const packageName = readPackageName(packageRoot);
  if (!scanRoot || !packageName) {
    return new Set();
  }

  let byPackage = crossPackageRequiredFilesCache.get(scanRoot);
  if (!byPackage) {
    byPackage = indexCrossPackageRequires(scanRoot);
    crossPackageRequiredFilesCache.set(scanRoot, byPackage);
  }
  return byPackage.get(packageName) ?? new Set();
}

function kibanaBuildRoot(packageRoot: string): string | null {
  let dir = packageRoot;
  for (let depth = 0; depth < 16; depth++) {
    if (readPackageName(dir) === 'kibana') {
      return Fs.realpathSync(dir);
    }
    const parent = Path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
  return null;
}

function readPackageName(packageRoot: string): string | null {
  const packageJson = Path.join(packageRoot, 'package.json');
  if (!Fs.existsSync(packageJson)) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(Fs.readFileSync(packageJson, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || !('name' in parsed)) {
      return null;
    }
    const { name } = parsed as { name?: unknown };
    return typeof name === 'string' ? name : null;
  } catch {
    return null;
  }
}

function discoverPackageRoots(scanRoot: string): Map<string, string> {
  const rootsByName = new Map<string, string>();
  const visit = (dir: string) => {
    const name = readPackageName(dir);
    if (name?.startsWith('@kbn/')) {
      rootsByName.set(name, Fs.realpathSync(dir));
    }
    for (const entry of Fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name === 'target') {
        continue;
      }
      visit(Path.join(dir, entry.name));
    }
  };
  visit(scanRoot);
  return rootsByName;
}

function indexCrossPackageRequires(scanRoot: string): ReadonlyMap<string, ReadonlySet<string>> {
  const rootsByName = discoverPackageRoots(scanRoot);

  const required = new Map<string, Set<string>>();
  const files: string[] = [];
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
      if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(abs);
      }
    }
  };
  for (const packageDir of rootsByName.values()) {
    visit(packageDir);
  }

  for (const file of files) {
    let code: string;
    try {
      code = Fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (!code.includes('@kbn/')) {
      continue;
    }
    for (const specifier of code.matchAll(/require\(\s*["'](@kbn\/[^"']+)["']\s*\)/g)) {
      const spec = specifier[1];
      if (!spec) {
        continue;
      }
      const resolved = resolvePackageSpecifier(spec, rootsByName);
      if (!resolved) {
        continue;
      }
      const packageName = spec.startsWith('@kbn/') ? `@kbn/${spec.split('/')[1]}` : null;
      if (!packageName) {
        continue;
      }
      const filesForPackage = required.get(packageName) ?? new Set<string>();
      filesForPackage.add(resolved);
      required.set(packageName, filesForPackage);
    }
  }

  return required;
}

function resolvePackageSpecifier(
  specifier: string,
  rootsByName: ReadonlyMap<string, string>
): string | null {
  const slash = specifier.indexOf('/', '@kbn/'.length);
  const packageName = slash === -1 ? specifier : specifier.slice(0, slash);
  const subpath = slash === -1 ? '' : specifier.slice(slash + 1);
  const packageRoot = rootsByName.get(packageName);
  if (!packageRoot || !subpath) {
    return null;
  }
  return resolveExisting(packageRoot, subpath);
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
      if (!entry.isFile() || !entry.name.endsWith('.js') || isBundleOutput(entry.name)) {
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

interface RequireCall {
  specifier: string;
  /** Inclusive start and exclusive end, as 0-based byte offsets into the source. */
  start: number;
  end: number;
}

interface AstNode {
  type?: string;
  span?: { start: number; end: number };
  operator?: string;
  value?: string;
  raw?: string;
  callee?: AstNode;
  arguments?: AstNode[];
  expression?: AstNode;
  test?: AstNode | null;
  consequent?: AstNode | AstNode[] | null;
  alternate?: AstNode | null;
  left?: AstNode;
  right?: AstNode;
  discriminant?: AstNode;
  cases?: AstNode[];
}

function requireSpecifiers(code: string, filename: string, topLevelOnly: boolean): string[] {
  return collectRequireCalls(code, filename, topLevelOnly).map((call) => call.specifier);
}

/**
 * `topLevelOnly` stops at functions and at branches. A top-level `if`, `?:`,
 * `&&` / `||` / `??`, or `switch` body stays a runtime `require` of the
 * original file, so unused code is never loaded. The shared-module scan passes
 * `false` and still sees those requires.
 */
function collectRequireCalls(code: string, filename: string, topLevelOnly: boolean): RequireCall[] {
  let body: unknown;
  try {
    body = parseSync(code, { syntax: 'ecmascript' }).body;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${filename} while bundling the server plugin: ${message}`);
  }

  // SWC spans are 1-based byte offsets plus a process-wide counter, so a later
  // file is not numbered from 0. One string literal is enough to recover the
  // shift for every span in this parse.
  const source = Buffer.from(code);
  const shift = spanShift(body, source);
  const calls: RequireCall[] = [];
  const visit = (node: unknown, conditional: boolean) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child, conditional);
      return;
    }

    const record = node as AstNode;
    if (topLevelOnly && record.type && FUNCTION_NODES.has(record.type)) {
      return;
    }
    if (topLevelOnly && record.type === 'IfStatement') {
      visit(record.test, conditional);
      visit(record.consequent, true);
      visit(record.alternate, true);
      return;
    }
    if (topLevelOnly && record.type === 'ConditionalExpression') {
      visit(record.test, conditional);
      visit(record.consequent, true);
      visit(record.alternate, true);
      return;
    }
    if (
      topLevelOnly &&
      (record.type === 'BinaryExpression' || record.type === 'LogicalExpression') &&
      record.operator &&
      SHORT_CIRCUIT_OPERATORS.has(record.operator)
    ) {
      visit(record.left, conditional);
      visit(record.right, true);
      return;
    }
    if (topLevelOnly && record.type === 'SwitchStatement') {
      visit(record.discriminant, conditional);
      for (const switchCase of record.cases ?? []) {
        visit(switchCase.test, conditional);
        visit(switchCase.consequent, true);
      }
      return;
    }
    if (
      record.type === 'CallExpression' &&
      record.callee?.type === 'Identifier' &&
      record.callee.value === 'require'
    ) {
      const arg = record.arguments?.[0]?.expression;
      const span = record.span;
      if (!conditional && arg?.type === 'StringLiteral' && arg.value && span) {
        calls.push({
          specifier: arg.value,
          start: span.start - 1 - shift,
          end: span.end - 1 - shift,
        });
      }
      visit(record.arguments, conditional);
      return;
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') visit(value, conditional);
    }
  };

  visit(body, false);
  return calls;
}

function spanShift(body: unknown, source: Buffer): number {
  const literals: Array<{ start: number; end: number; raw: Buffer }> = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    const record = node as AstNode;
    if (record.type === 'StringLiteral' && record.raw && record.span) {
      literals.push({
        start: record.span.start,
        end: record.span.end,
        raw: Buffer.from(record.raw),
      });
    }
    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') visit(value);
    }
  };
  visit(body);
  const first = literals[0];
  if (!first) {
    return 0;
  }

  let from = 0;
  while (from < source.length) {
    const index = source.indexOf(first.raw, from);
    if (index === -1) {
      break;
    }
    const shift = first.start - 1 - index;
    const aligned = literals.every((literal) => {
      const start = literal.start - 1 - shift;
      const end = literal.end - 1 - shift;
      return start >= 0 && end <= source.length && source.subarray(start, end).equals(literal.raw);
    });
    if (aligned) {
      return shift;
    }
    from = index + 1;
  }

  throw new Error('Failed to align parser spans with the source while bundling the server plugin');
}

function isBundleOutput(name: string): boolean {
  return name === 'plugin.bundle.js' || /^plugin\.chunk-\d+\.js$/.test(name);
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

function relativeKey(fromDir: string, target: string): string {
  return Path.relative(fromDir, target).split(Path.sep).join('/');
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
  const directiveLength = leadingUseStrictLength(source);
  if (directiveLength === 0) {
    return injected + source;
  }
  return source.slice(0, directiveLength) + injected + source.slice(directiveLength);
}

/**
 * Length of a leading `"use strict"` directive, including the comments and
 * whitespace in front of it. Scanned directly so a long block comment cannot
 * make a matcher backtrack.
 */
function leadingUseStrictLength(source: string): number {
  let index = 0;
  while (index < source.length) {
    const char = source[index] ?? '';
    if (/\s/.test(char)) {
      index++;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const close = source.indexOf('*/', index + 2);
      if (close === -1) {
        return 0;
      }
      index = close + 2;
      continue;
    }
    if (source.startsWith('//', index)) {
      const newline = source.indexOf('\n', index + 2);
      if (newline === -1) {
        return 0;
      }
      index = newline + 1;
      continue;
    }
    break;
  }

  const quote = source[index];
  if ((quote !== '"' && quote !== "'") || !source.startsWith(`${quote}use strict${quote}`, index)) {
    return 0;
  }
  index += '"use strict"'.length;
  if (source[index] === ';') {
    index++;
  }
  if (source[index] === '\n') {
    index++;
  }
  return index;
}

function isInside(root: string, file: string): boolean {
  const relative = Path.relative(root, file);
  return relative === '' || (!relative.startsWith('..') && !Path.isAbsolute(relative));
}
