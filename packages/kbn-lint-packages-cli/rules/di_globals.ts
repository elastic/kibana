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

const GLOBAL_TOKEN_RE = /^[a-z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$/;

type TokenKind = 'service' | 'extensionPoint';

interface TokenMetadata {
  exportName: string;
  kind: TokenKind;
  name: string;
}

export const extractTokenMetadataFromSource = (entryFile: string): TokenMetadata[] => {
  const extractStringArg = (source: string, start: number): string | undefined => {
    let index = start;

    while (/\s/.test(source[index] ?? '')) {
      index += 1;
    }

    if (source[index] === '<') {
      let depth = 0;

      while (index < source.length) {
        const char = source[index];
        index += 1;

        if (char === '<') {
          depth += 1;
        } else if (char === '>') {
          depth -= 1;
          if (depth === 0) {
            break;
          }
        }
      }

      while (/\s/.test(source[index] ?? '')) {
        index += 1;
      }
    }

    if (source[index] !== '(') {
      return undefined;
    }

    index += 1;

    while (/\s/.test(source[index] ?? '')) {
      index += 1;
    }

    const quote = source[index];
    if (quote !== "'" && quote !== '"') {
      return undefined;
    }

    index += 1;
    const end = source.indexOf(quote, index);
    if (end === -1) {
      return undefined;
    }

    return source.slice(index, end);
  };

  const tokenFactoryDirectImports = new Set<string>();
  const directImportRe = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]@kbn\/plugin-di['"]/g;
  let directImportMatch: RegExpExecArray | null;
  while ((directImportMatch = directImportRe.exec(entryFile)) !== null) {
    const [, specifiers] = directImportMatch;

    for (const rawSpecifier of specifiers.split(',')) {
      const specifier = rawSpecifier.trim().replace(/^type\s+/, '');
      if (!specifier) {
        continue;
      }

      const [importedName, alias] = specifier.split(/\s+as\s+/).map((part) => part.trim());
      if (importedName === 'createTokenFactory') {
        tokenFactoryDirectImports.add(alias ?? importedName);
      }
    }
  }

  const tokenFactoryNamespaceImports = new Set<string>();
  const namespaceImportRe =
    /import\s+\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"]@kbn\/plugin-di['"]/g;
  let namespaceImportMatch: RegExpExecArray | null;
  while ((namespaceImportMatch = namespaceImportRe.exec(entryFile)) !== null) {
    tokenFactoryNamespaceImports.add(namespaceImportMatch[1]);
  }

  const pluginScopes = new Map<string, string>();
  for (const helperName of tokenFactoryDirectImports) {
    const scopeRe = new RegExp(
      `const\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*${escapeForRegExp(helperName)}\\b`,
      'g'
    );
    let scopeMatch: RegExpExecArray | null;
    while ((scopeMatch = scopeRe.exec(entryFile)) !== null) {
      const [, scopeName] = scopeMatch;
      const pluginId = extractStringArg(entryFile, scopeRe.lastIndex);
      if (pluginId) {
        pluginScopes.set(scopeName, pluginId);
      }
    }
  }

  for (const namespaceName of tokenFactoryNamespaceImports) {
    const scopeRe = new RegExp(
      `const\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*${escapeForRegExp(
        namespaceName
      )}\\.createTokenFactory\\b`,
      'g'
    );
    let scopeMatch: RegExpExecArray | null;
    while ((scopeMatch = scopeRe.exec(entryFile)) !== null) {
      const [, scopeName] = scopeMatch;
      const pluginId = extractStringArg(entryFile, scopeRe.lastIndex);
      if (pluginId) {
        pluginScopes.set(scopeName, pluginId);
      }
    }
  }

  const results: TokenMetadata[] = [];
  const pushToken = (
    exportName: string,
    pluginId: string | undefined,
    methodName: string,
    localName: string | undefined
  ) => {
    if (!pluginId || !localName) {
      return;
    }

    const fullName = `${pluginId}.${localName}`;
    if (!GLOBAL_TOKEN_RE.test(fullName)) {
      return;
    }

    results.push({
      exportName,
      kind: methodName === 'service' ? 'service' : 'extensionPoint',
      name: fullName,
    });
  };

  const scopedTokenRe =
    /export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*([A-Za-z_$][A-Za-z0-9_$]*)\.(service|extensionPoint)\b/g;
  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = scopedTokenRe.exec(entryFile)) !== null) {
    const [, exportName, scopeName, methodName] = tokenMatch;
    pushToken(
      exportName,
      pluginScopes.get(scopeName),
      methodName,
      extractStringArg(entryFile, scopedTokenRe.lastIndex)
    );
  }

  for (const helperName of tokenFactoryDirectImports) {
    const inlineTokenRe = new RegExp(
      `export\\s+const\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*${escapeForRegExp(helperName)}\\b\\s*`,
      'g'
    );
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = inlineTokenRe.exec(entryFile)) !== null) {
      const [, exportName] = inlineMatch;
      const pluginId = extractStringArg(entryFile, inlineTokenRe.lastIndex);
      if (!pluginId) {
        continue;
      }

      const methodMatch = /\.\s*(service|extensionPoint)\b/g;
      methodMatch.lastIndex = inlineTokenRe.lastIndex;
      const foundMethod = methodMatch.exec(entryFile);
      if (!foundMethod) {
        continue;
      }

      pushToken(
        exportName,
        pluginId,
        foundMethod[1],
        extractStringArg(entryFile, methodMatch.lastIndex)
      );
    }
  }

  for (const namespaceName of tokenFactoryNamespaceImports) {
    const inlineTokenRe = new RegExp(
      `export\\s+const\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*${escapeForRegExp(
        namespaceName
      )}\\.createTokenFactory\\b\\s*`,
      'g'
    );
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = inlineTokenRe.exec(entryFile)) !== null) {
      const [, exportName] = inlineMatch;
      const pluginId = extractStringArg(entryFile, inlineTokenRe.lastIndex);
      if (!pluginId) {
        continue;
      }

      const methodMatch = /\.\s*(service|extensionPoint)\b/g;
      methodMatch.lastIndex = inlineTokenRe.lastIndex;
      const foundMethod = methodMatch.exec(entryFile);
      if (!foundMethod) {
        continue;
      }

      pushToken(
        exportName,
        pluginId,
        foundMethod[1],
        extractStringArg(entryFile, methodMatch.lastIndex)
      );
    }
  }

  return results;
};

const tryReadFile = (absPath: string): string | undefined => {
  try {
    return Fs.readFileSync(absPath, 'utf8');
  } catch {
    return undefined;
  }
};

const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractArgIdentifiers = (source: string, fnName: string, argIndex = 0): string[] => {
  const identifier = '([A-Za-z_$][A-Za-z0-9_$]*)';
  const args = Array.from({ length: argIndex + 1 }, (_, index) =>
    index === argIndex ? identifier : '[A-Za-z_$][A-Za-z0-9_$]*'
  );
  const re = new RegExp(`\\b${fnName}\\s*\\(\\s*${args.join('\\s*,\\s*')}\\s*[,)]`, 'g');
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    results.push(m[1]);
  }
  return results;
};

interface ImportedSymbol {
  importedName: string;
  packageId: string;
}

const findImportedSymbol = (source: string, localName: string): ImportedSymbol | undefined => {
  const importRe = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"](@kbn\/[^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRe.exec(source)) !== null) {
    const [, specifiers, packageId] = match;

    for (const rawSpecifier of specifiers.split(',')) {
      const specifier = rawSpecifier.trim().replace(/^type\s+/, '');
      if (!specifier) continue;

      const [importedName, alias] = specifier.split(/\s+as\s+/).map((part) => part.trim());
      const resolvedLocalName = alias ?? importedName;

      if (resolvedLocalName === localName) {
        return { importedName, packageId };
      }
    }
  }

  return undefined;
};

const resolvePkgDir = (() => {
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

const extractTokenMetadata = (pkgDir: string): TokenMetadata[] => {
  const entryFile =
    tryReadFile(Path.join(pkgDir, 'index.ts')) ?? tryReadFile(Path.join(pkgDir, 'src', 'index.ts'));
  if (!entryFile) return [];
  return extractTokenMetadataFromSource(entryFile);
};

const resolveTokenNames = (identifiers: string[], source: string, kind: TokenKind): string[] => {
  const tokenNames = new Set<string>();

  for (const ident of identifiers) {
    const importedSymbol = findImportedSymbol(source, ident);
    if (!importedSymbol) continue;
    const pkgDir = resolvePkgDir(importedSymbol.packageId);
    if (!pkgDir) continue;

    for (const token of extractTokenMetadata(pkgDir)) {
      if (token.kind === kind && token.exportName === importedSymbol.importedName) {
        tokenNames.add(token.name);
      }
    }
  }

  return [...tokenNames].sort();
};

interface GlobalsState {
  services: {
    provides: string[];
    consumes: string[];
  };
  extensionPoints: {
    hosts: string[];
    contributes: string[];
  };
}

const setGlobals = (source: string, values: GlobalsState): string => {
  const pluginProp = getProp(source, 'plugin');
  if (!pluginProp || pluginProp.value.type !== 'ObjectExpression') {
    return source;
  }

  const pluginNode = pluginProp.value as any;
  const globals: Record<string, unknown> = {};

  if (values.services.provides.length || values.services.consumes.length) {
    globals.services = {};
    if (values.services.provides.length) {
      (globals.services as any).provides = [...values.services.provides].sort();
    }
    if (values.services.consumes.length) {
      (globals.services as any).consumes = [...values.services.consumes].sort();
    }
  }

  if (values.extensionPoints.hosts.length || values.extensionPoints.contributes.length) {
    globals.extensionPoints = {};
    if (values.extensionPoints.hosts.length) {
      (globals.extensionPoints as any).hosts = [...values.extensionPoints.hosts].sort();
    }
    if (values.extensionPoints.contributes.length) {
      (globals.extensionPoints as any).contributes = [...values.extensionPoints.contributes].sort();
    }
  }

  if (Object.keys(globals).length === 0) {
    return setProp(source, 'globals', undefined as any, { node: pluginNode });
  }

  return setProp(source, 'globals', globals, { node: pluginNode, spaces: '    ' });
};

const compareArrays = (a: readonly string[], b: readonly string[]) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

const mergeUnique = (detected: readonly string[], manifest: readonly string[]): string[] =>
  [...new Set([...detected, ...manifest])].sort();

/**
 * Unions the statically detected contract surface with the values already in
 * the manifest. The detected set is additive only: manifest entries the rule
 * cannot observe statically — dynamic or lazy `getService(...)` resolution, or
 * `bind(...)` escape-hatch registrations — are preserved rather than dropped by
 * `--fix`. Without a generated/manual boundary the rule cannot prove such an
 * entry is stale, so it never removes manifest values.
 */
export const mergeGlobals = (detected: GlobalsState, manifest: GlobalsState): GlobalsState => ({
  services: {
    provides: mergeUnique(detected.services.provides, manifest.services.provides),
    consumes: mergeUnique(detected.services.consumes, manifest.services.consumes),
  },
  extensionPoints: {
    hosts: mergeUnique(detected.extensionPoints.hosts, manifest.extensionPoints.hosts),
    contributes: mergeUnique(
      detected.extensionPoints.contributes,
      manifest.extensionPoints.contributes
    ),
  },
});

/**
 * Keeps `plugin.globals` aligned with the statically visible cross-plugin
 * contract surface. Dynamic or lazy resolution patterns still require manual
 * annotation because this rule intentionally operates on explicit call sites;
 * `--fix` only adds detected entries and never removes manifest values, so
 * those manual annotations survive.
 */
export const diGlobalsRule = PackageRule.create('diGlobals', {
  async check({ pkg }) {
    if (!pkg.isPlugin()) return;

    const pluginId: string = pkg.manifest.plugin.id;
    const manifestGlobals = pkg.manifest.plugin.globals ?? {};
    const manifestValues: GlobalsState = {
      services: {
        provides: [...(manifestGlobals.services?.provides ?? [])].sort(),
        consumes: [...(manifestGlobals.services?.consumes ?? [])].sort(),
      },
      extensionPoints: {
        hosts: [...(manifestGlobals.extensionPoints?.hosts ?? [])].sort(),
        contributes: [...(manifestGlobals.extensionPoints?.contributes ?? [])].sort(),
      },
    };

    const nextValues: GlobalsState = {
      services: { provides: [], consumes: [] },
      extensionPoints: { hosts: [], contributes: [] },
    };

    for (const entryRel of ['server/index.ts', 'public/index.ts']) {
      const entrySource = tryReadFile(Path.join(pkg.directory, entryRel));
      if (!entrySource) continue;

      for (const name of resolveTokenNames(
        extractArgIdentifiers(entrySource, 'provide'),
        entrySource,
        'service'
      )) {
        if (name.split('.')[0] === pluginId) {
          nextValues.services.provides.push(name);
        }
      }

      for (const name of resolveTokenNames(
        extractArgIdentifiers(entrySource, 'host'),
        entrySource,
        'extensionPoint'
      )) {
        if (name.split('.')[0] === pluginId) {
          nextValues.extensionPoints.hosts.push(name);
        }
      }

      for (const name of resolveTokenNames(
        extractArgIdentifiers(entrySource, 'contribute'),
        entrySource,
        'extensionPoint'
      )) {
        if (name.split('.')[0] !== pluginId) {
          nextValues.extensionPoints.contributes.push(name);
        }
      }
    }

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

      const serviceUsage = [
        ...extractArgIdentifiers(source, 'getService', 1),
        ...extractArgIdentifiers(source, 'useService'),
        ...extractArgIdentifiers(source, 'injectService'),
      ];

      for (const name of resolveTokenNames(serviceUsage, source, 'service')) {
        if (name.split('.')[0] !== pluginId) {
          nextValues.services.consumes.push(name);
        }
      }
    }

    nextValues.services.provides = [...new Set(nextValues.services.provides)].sort();
    nextValues.services.consumes = [...new Set(nextValues.services.consumes)].sort();
    nextValues.extensionPoints.hosts = [...new Set(nextValues.extensionPoints.hosts)].sort();
    nextValues.extensionPoints.contributes = [
      ...new Set(nextValues.extensionPoints.contributes),
    ].sort();

    const targetValues = mergeGlobals(nextValues, manifestValues);

    const missing = new Set<string>();
    if (!compareArrays(targetValues.services.provides, manifestValues.services.provides)) {
      missing.add('plugin.globals.services');
    }
    if (!compareArrays(targetValues.services.consumes, manifestValues.services.consumes)) {
      missing.add('plugin.globals.services');
    }
    if (!compareArrays(targetValues.extensionPoints.hosts, manifestValues.extensionPoints.hosts)) {
      missing.add('plugin.globals.extensionPoints');
    }
    if (
      !compareArrays(
        targetValues.extensionPoints.contributes,
        manifestValues.extensionPoints.contributes
      )
    ) {
      missing.add('plugin.globals.extensionPoints');
    }

    if (missing.size === 0) {
      return;
    }

    this.err(`plugin.globals is out of sync (${[...missing].join(', ')})`, {
      'kibana.jsonc': (source) => setGlobals(source, targetValues),
    });
  },
});
