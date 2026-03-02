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

import { PackageRule } from '@kbn/repo-linter';
import { setProp, getProp } from '@kbn/json-ast';
import { TS_PROJECTS } from '@kbn/ts-projects';

// Token name pattern: <pluginId>.<ServiceName>
const GLOBAL_TOKEN_RE = /^[a-z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$/;

// --------------------------------------------------------------------------
// Source-scanning helpers
// --------------------------------------------------------------------------

/**
 * Reads a file from an absolute path; returns `undefined` if it does not
 * exist (rather than throwing).
 */
const tryReadFile = (absPath: string): string | undefined => {
  try {
    return Fs.readFileSync(absPath, 'utf8');
  } catch {
    return undefined;
  }
};

/**
 * Extracts all identifiers passed as the first argument to `publish(...)`.
 *
 * Handles both:
 * - `publish(MyToken)` (returns a binding chain)
 * - `publish(MyToken, Start, mapper)` (three-argument shorthand)
 */
const extractPublishVarNames = (source: string): string[] => {
  const re = /\bpublish\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*[,)]/g;
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    results.push(m[1]);
  }
  return results;
};

/**
 * Extracts all identifiers passed as the first argument to
 * `container.get(...)` or `container.getAll(...)` calls.
 */
const extractGetVarNames = (source: string): string[] => {
  const re = /\.(?:get|getAll)\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*[,)]/g;
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    results.push(m[1]);
  }
  return results;
};

/**
 * Extracts all `@kbn/...` package specifiers imported in `source`.
 */
const extractKbnImports = (source: string): string[] => {
  const re = /from\s+['"](@kbn\/[^'"]+)['"]/g;
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    results.push(m[1]);
  }
  return results;
};

/**
 * For a given identifier name, finds the `@kbn/...` package it is imported
 * from in `source`.
 */
const findImportPackage = (source: string, varName: string): string | undefined => {
  // Matches: import { varName, ... } from '@kbn/pkg' (or with whitespace/aliases)
  const re = new RegExp(
    `import\\s+(?:type\\s+)?\\{[^}]*\\b${varName}\\b[^}]*\\}\\s+from\\s+['"](@kbn/[^'"]+)['"]`
  );
  return source.match(re)?.[1];
};

/**
 * Returns the absolute directory for a given `@kbn/...` import specifier by
 * scanning the known TypeScript projects.
 */
const resolvePkgDir = (() => {
  // Lazy-built map: rootImportReq → directory.
  let cache: Map<string, string> | undefined;
  return (pkgId: string): string | undefined => {
    if (!cache) {
      cache = new Map(
        TS_PROJECTS.flatMap((p) => (p.rootImportReq ? [[p.rootImportReq, p.directory]] : []))
      );
    }
    return cache.get(pkgId);
  };
})();

/**
 * Finds the `createToken('...')` calls in a package source file and returns
 * the string arguments that match the `<pluginId>.<ServiceName>` format.
 */
const extractTokenNames = (pkgDir: string): string[] => {
  const entryFile =
    tryReadFile(Path.join(pkgDir, 'index.ts')) ?? tryReadFile(Path.join(pkgDir, 'src', 'index.ts'));
  if (!entryFile) return [];

  // Skip generics (which may be nested like <FunctionComponent<Props>>) by
  // matching anything that is not an opening paren before the argument list.
  const re = /\bcreateToken[^(]*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(entryFile)) !== null) {
    if (GLOBAL_TOKEN_RE.test(m[1])) results.push(m[1]);
  }
  return results;
};

/**
 * Given a list of identifiers and the source file they appear in, resolves
 * each identifier to the token name(s) it represents by following its import
 * to the types package.
 *
 * Returns a flat deduplicated list of token names.
 */
const resolveTokenNames = (identifiers: string[], source: string): string[] => {
  const tokenNames = new Set<string>();
  for (const ident of identifiers) {
    const pkgId = findImportPackage(source, ident);
    if (!pkgId) continue;
    const pkgDir = resolvePkgDir(pkgId);
    if (!pkgDir) continue;
    for (const name of extractTokenNames(pkgDir)) {
      tokenNames.add(name);
    }
  }
  return [...tokenNames].sort();
};

// --------------------------------------------------------------------------
// kibana.jsonc mutation helpers
// --------------------------------------------------------------------------

type GlobalsKey = 'provides' | 'consumes';

/**
 * Updates `plugin.globals.<key>` in a `kibana.jsonc` source string.
 *
 * - If `globals` does not exist in the `plugin` object it is created.
 * - The array is always written sorted alphabetically.
 * - If `values` is empty the key is omitted (removed) from `globals`.
 */
const setGlobalsArray = (source: string, key: GlobalsKey, values: readonly string[]): string => {
  const pluginProp = getProp(source, 'plugin');
  if (!pluginProp || pluginProp.value.type !== 'ObjectExpression') {
    return source;
  }

  const sorted = [...values].sort();
  const pluginNode = pluginProp.value as any;

  // Read the existing sibling key so we can write both together.
  const siblingKey: GlobalsKey = key === 'provides' ? 'consumes' : 'provides';
  let siblingValues: string[] = [];
  const existingGlobalsProp = (pluginNode.properties as any[]).find(
    (p: any) => p.type === 'ObjectProperty' && p.key?.value === 'globals'
  );
  if (existingGlobalsProp?.value?.type === 'ObjectExpression') {
    const globalsNode = existingGlobalsProp.value;
    const siblingProp = (globalsNode.properties as any[]).find(
      (p: any) => p.type === 'ObjectProperty' && p.key?.value === siblingKey
    );
    if (siblingProp?.value?.type === 'ArrayExpression') {
      siblingValues = siblingProp.value.elements
        .filter((e: any) => e?.type === 'StringLiteral')
        .map((e: any) => e.value as string);
    }
  }

  const newGlobals: Record<string, string[]> = {};
  const providesArr = key === 'provides' ? sorted : siblingValues.sort();
  const consumesArr = key === 'consumes' ? sorted : siblingValues.sort();
  if (providesArr.length) newGlobals.provides = providesArr;
  if (consumesArr.length) newGlobals.consumes = consumesArr;

  if (Object.keys(newGlobals).length === 0) {
    // Nothing to write — remove the globals key entirely if present.
    if (existingGlobalsProp) {
      return setProp(source, 'globals', undefined as any, { node: pluginNode });
    }
    return source;
  }

  return setProp(source, 'globals', newGlobals, { node: pluginNode, spaces: '    ' });
};

// --------------------------------------------------------------------------
// The rule
// --------------------------------------------------------------------------

/**
 * Keeps `plugin.globals.provides` and `plugin.globals.consumes` in
 * `kibana.jsonc` in sync with what the plugin's source code actually
 * provides / consumes via the Global DI system.
 *
 * **Classification**: the token's namespace (the part before the first `.`)
 * determines whether it belongs in `provides` or `consumes`:
 * - namespace matches pluginId → **provides**
 * - namespace differs from pluginId → **consumes**
 *
 * **Provides detection** — two signals:
 * 1. `publish(Token)` calls in `server/index.ts` and `public/index.ts`.
 * 2. `container.get(Token)` / `container.getAll(Token)` calls in any source
 *    file — covers collection-pattern tokens where the owning plugin
 *    consumes the registry it hosts (e.g. `embeddable.FactoryRegistration`).
 *
 * **Consumes detection** — import-based: any `@kbn/*` import that exports
 * global tokens with a namespace not matching this plugin's ID.
 *
 * Auto-fix updates `globals.provides` / `globals.consumes`, keeping both
 * arrays sorted alphabetically.
 */
export const diGlobalsRule = PackageRule.create('diGlobals', {
  async check({ pkg }) {
    // Only applies to plugin packages.
    if (!pkg.isPlugin()) return;

    const pluginId: string = pkg.manifest.plugin.id;
    const currentGlobals = pkg.manifest.plugin.globals ?? {};
    const manifestProvides: string[] = [...(currentGlobals.provides ?? [])].sort();
    const manifestConsumes: string[] = [...(currentGlobals.consumes ?? [])].sort();

    // -----------------------------------------------------------------------
    // Provides side:
    //   1. scan service entry points for publish() calls
    //   2. scan all source files for container.get() / getAll() calls
    //
    // Both scanners resolve identifiers to token names, then keep only tokens
    // whose namespace matches this plugin's ID.
    // -----------------------------------------------------------------------
    const providesTokens = new Set<string>();

    // Signal 1: publish() in entry points.
    for (const entryRel of ['server/index.ts', 'public/index.ts']) {
      const entrySource = tryReadFile(Path.join(pkg.directory, entryRel));
      if (!entrySource) continue;

      const varNames = extractPublishVarNames(entrySource);
      if (!varNames.length) continue;

      for (const name of resolveTokenNames(varNames, entrySource)) {
        const [ns] = name.split('.');
        if (ns === pluginId) {
          providesTokens.add(name);
        }
      }
    }

    // Signal 2: container.get() / getAll() in all source files.
    const scannedPkgsForProvides = new Set<string>();
    for (const file of this.getAllFiles()) {
      if (!file.isJsTsCode()) continue;
      if (
        file.repoRel.includes('.test.') ||
        file.repoRel.includes('.spec.') ||
        file.repoRel.includes('/node_modules/')
      ) {
        continue;
      }

      const source = tryReadFile(file.abs);
      if (!source) continue;

      const varNames = extractGetVarNames(source);
      if (!varNames.length) continue;

      for (const ident of varNames) {
        const pkgId = findImportPackage(source, ident);
        if (!pkgId) continue;
        if (scannedPkgsForProvides.has(pkgId)) continue;
        scannedPkgsForProvides.add(pkgId);

        const pkgDir = resolvePkgDir(pkgId);
        if (!pkgDir) continue;

        for (const name of extractTokenNames(pkgDir)) {
          const [ns] = name.split('.');
          if (ns === pluginId) {
            providesTokens.add(name);
          }
        }
      }
    }

    const providesSorted = [...providesTokens].sort();
    const providesChanged = JSON.stringify(providesSorted) !== JSON.stringify(manifestProvides);

    if (providesChanged) {
      const missing = providesSorted.filter((t) => !manifestProvides.includes(t));
      const extra = manifestProvides.filter((t) => !providesTokens.has(t));
      const parts: string[] = [];
      if (missing.length) parts.push(`missing in globals.provides: ${missing.join(', ')}`);
      if (extra.length) parts.push(`stale in globals.provides: ${extra.join(', ')}`);

      this.err(`plugin.globals.provides is out of sync (${parts.join('; ')})`, {
        'kibana.jsonc': (source) => setGlobalsArray(source, 'provides', providesSorted),
      });
    }

    // -----------------------------------------------------------------------
    // Consumes side: scan all source files for imports of global token packages.
    //
    // Strategy: if a plugin imports from a @kbn/* package that exports global
    // tokens (identified via createToken('<externalPluginId>.<ServiceName>')),
    // and those tokens have a namespace that does NOT match this plugin's ID,
    // they are considered consumed.  This catches all usage patterns
    // (useService, @inject, container.get, etc.) in one pass.
    // -----------------------------------------------------------------------
    const consumesTokens = new Set<string>();
    const scannedPkgsForConsumes = new Set<string>();

    for (const file of this.getAllFiles()) {
      if (!file.isJsTsCode()) continue;
      if (
        file.repoRel.includes('.test.') ||
        file.repoRel.includes('.spec.') ||
        file.repoRel.includes('/node_modules/')
      ) {
        continue;
      }

      const source = tryReadFile(file.abs);
      if (!source) continue;

      for (const pkgId of extractKbnImports(source)) {
        if (scannedPkgsForConsumes.has(pkgId)) continue;
        scannedPkgsForConsumes.add(pkgId);

        const pkgDir = resolvePkgDir(pkgId);
        if (!pkgDir) continue;

        for (const name of extractTokenNames(pkgDir)) {
          const [tokenNamespace] = name.split('.');
          if (tokenNamespace !== pluginId) {
            consumesTokens.add(name);
          }
        }
      }
    }

    // Defensive: subtract any token already in provides (namespace partitioning
    // should make this impossible, but guard against edge cases).
    for (const t of providesTokens) {
      consumesTokens.delete(t);
    }

    const consumesSorted = [...consumesTokens].sort();
    const consumesChanged = JSON.stringify(consumesSorted) !== JSON.stringify(manifestConsumes);

    if (consumesChanged) {
      const missing = consumesSorted.filter((t) => !manifestConsumes.includes(t));
      const extra = manifestConsumes.filter((t) => !consumesTokens.has(t));
      const parts: string[] = [];
      if (missing.length) parts.push(`missing in globals.consumes: ${missing.join(', ')}`);
      if (extra.length) parts.push(`stale in globals.consumes: ${extra.join(', ')}`);

      this.err(`plugin.globals.consumes is out of sync (${parts.join('; ')})`, {
        'kibana.jsonc': (source) => setGlobalsArray(source, 'consumes', consumesSorted),
      });
    }
  },
});
