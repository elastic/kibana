/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';
import Fs from 'fs';

import { getPackageJson } from '../config_generation/generate_package_json.mjs';
import { getTsconfig } from '../config_generation/generate_tsconfig.mjs';

/**
 * @param {any} aPath
 * @param {any} bPath
 */
function normalizePath(aPath, bPath) {
  if (`./${bPath}` === aPath) {
    return aPath;
  }

  return bPath;
}

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isObj(v) {
  return typeof v === 'object' && v !== null;
}

/**
 * @param {unknown} obj
 * @returns {Map<string, unknown>}
 */
function toMap(obj) {
  return isObj(obj)
    ? new Map(Object.entries(obj).map(([k, v]) => [k, v == null ? null : v]))
    : new Map();
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function eql(a, b) {
  if (a === b) {
    return true;
  }

  if (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((x) => b.includes(x))
  ) {
    return true;
  }

  return false;
}

/**
 * @param {Map<string, unknown>} aMap
 * @param {Map<string, unknown>} bMap
 */
function diff(aMap, bMap) {
  const bChanges = new Map();
  for (const key of new Set([...aMap.keys(), ...bMap.keys()])) {
    const a = aMap.get(key);
    const b = bMap.get(key);

    if (!eql(a, b)) {
      bChanges.set(key, b);
    }
  }

  return bChanges;
}

/** @type {import('../lib/command').Command} */
export const command = {
  name: '_x',
  async run({ log }) {
    const { REPO_ROOT } = await import('@kbn/utils');
    const globby = await import('globby');
    const { discoverBazelPackages, Jsonc, BAZEL_PACKAGE_DIRS } = await import(
      '@kbn/bazel-packages'
    );

    // validate that all packages have a kibana.jsonc file
    for await (const path of globby.stream(BAZEL_PACKAGE_DIRS.map((d) => `${d}/*/package.json`))) {
      const dir = Path.dirname(path.toString());
      const stat = await Fsp.stat(Path.resolve(dir, 'kibana.jsonc'));
      if (!stat.isFile()) {
        throw new Error(`missing kibana.jsonc file in ${Path.relative(REPO_ROOT, dir)}`);
      }
    }

    for (const pkg of await discoverBazelPackages(REPO_ROOT)) {
      const pkgJsonOverrides = await migratePackageJson(pkg);
      if (pkgJsonOverrides) {
        await updateManifest(pkg, { pkgJsonOverrides });
      }

      const tsSettings = await migrateTsconfig(pkg);
      if (tsSettings) {
        await updateManifest(pkg, tsSettings);
      }

      if (pkgJsonOverrides || tsSettings) {
        log.success('updated', pkg.manifest.id);
      }
    }

    /**
     * @param {import('@kbn/bazel-packages').BazelPackage} pkg
     * @param {Record<string, unknown>} updates
     */
    async function updateManifest(pkg, updates) {
      const jsoncPath = Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir, 'kibana.jsonc');
      const kibanaJsonc = /** @type {Record<any, any>} */ (
        /** @type {unknown} */ (Jsonc.parse(await Fsp.readFile(jsoncPath, 'utf8')))
      );

      const updated = {
        ...kibanaJsonc,
        __deprecated__TalkToOperationsIfYouThinkYouNeedThis: {
          ...kibanaJsonc.__deprecated__TalkToOperationsIfYouThinkYouNeedThis,
          ...updates,
        },
      };

      pkg.manifest.__deprecated__TalkToOperationsIfYouThinkYouNeedThis =
        updated.__deprecated__TalkToOperationsIfYouThinkYouNeedThis;

      await Fsp.writeFile(
        jsoncPath,
        JSON.stringify(updated, null, 2)
          .replaceAll(/([}\]"])$/gm, '$1,')
          .slice(0, -1) + '\n'
      );
    }

    /**
     * @param {import('@kbn/bazel-packages').BazelPackage} pkg
     */
    async function migratePackageJson(pkg) {
      const pkgJsonPath = Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir, 'package.json');
      const generatedPkgJson = new Map(
        Object.entries(
          getPackageJson(
            {
              ...pkg.manifest,
              __deprecated__TalkToOperationsIfYouThinkYouNeedThis: undefined,
            },
            pkg.normalizedRepoRelativeDir
          )
        )
      );
      const actualPkgJson = new Map(
        Object.entries(JSON.parse(await Fsp.readFile(pkgJsonPath, 'utf8')))
      );

      actualPkgJson.delete('description');
      actualPkgJson.delete('license');
      actualPkgJson.delete('peerDependencies');
      actualPkgJson.delete('repository');
      actualPkgJson.delete('keywords');
      actualPkgJson.delete('private');
      actualPkgJson.delete('types');
      actualPkgJson.delete('typings');
      actualPkgJson.delete('standard');
      actualPkgJson.delete('directories');
      actualPkgJson.delete('version');
      actualPkgJson.delete('author');
      actualPkgJson.delete('homepage');
      actualPkgJson.delete('bugs');

      if (!actualPkgJson.has('main')) {
        actualPkgJson.set('main', './index.js');
      } else if (
        `./${actualPkgJson.get('main')}` === generatedPkgJson.get('main') ||
        `${actualPkgJson.get('main')}/index.js` === generatedPkgJson.get('main')
      ) {
        actualPkgJson.delete('main');
      }

      const changes = new Map();
      for (const key of actualPkgJson.keys()) {
        const a = actualPkgJson.get(key);
        const g = generatedPkgJson.get(key);
        if (a !== g) {
          changes.set(key, a);
        }
      }

      await Fsp.unlink(pkgJsonPath);
      if (changes.size) {
        return Object.fromEntries(changes);
      }
    }

    /**
     * @param {import('@kbn/bazel-packages').BazelPackage} pkg
     */
    async function migrateTsconfig(pkg) {
      const tsconfigPath = Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir, 'tsconfig.json');
      if (!Fs.existsSync(tsconfigPath)) {
        log.warning(pkg.manifest.id, 'has no tsconfig.json file');
        return {
          noTsConfig: true,
        };
      }

      const generatedTsconfig = getTsconfig(pkg.manifest, pkg.normalizedRepoRelativeDir);
      const generatedCompilerOptions = toMap(generatedTsconfig.compilerOptions);

      const actualTsconfig = /** @type {any} */ (
        Jsonc.parse(await Fsp.readFile(tsconfigPath, 'utf8'))
      );
      const actualCompilerOptions = toMap(actualTsconfig?.compilerOptions ?? {});

      actualCompilerOptions.delete('target');
      actualCompilerOptions.delete('declaration');
      actualCompilerOptions.delete('declarationMap');
      actualCompilerOptions.delete('emitDeclarationOnly');

      actualCompilerOptions.set('rootDir', actualCompilerOptions.get('rootDir') ?? '.');
      actualCompilerOptions.set(
        'outDir',
        normalizePath(actualCompilerOptions.get('outDir'), generatedCompilerOptions.get('outDir'))
      );

      if ((actualCompilerOptions.get('stripInternal') ?? false) === false) {
        actualCompilerOptions.delete('stripInternal');
      }
      if ((actualCompilerOptions.get('incremental') ?? false) === false) {
        actualCompilerOptions.delete('incremental');
      }
      if ((actualCompilerOptions.get('composite') ?? false) === false) {
        actualCompilerOptions.delete('composite');
      }

      await Fsp.unlink(tsconfigPath);

      const compOptsChanges = diff(generatedCompilerOptions, actualCompilerOptions);

      /** @type {Record<string, unknown>} */
      const changes = {};
      if (
        !eql(generatedTsconfig.include, actualTsconfig.include) &&
        !eql(['**/*.ts'], actualTsconfig.include)
      ) {
        changes.tsInclude = actualTsconfig.include ?? null;
      }
      if (actualTsconfig.exclude) {
        changes.tsExclude = actualTsconfig.exclude;
      }

      if (compOptsChanges.size) {
        changes.tsCompOptsOverrides = Object.fromEntries(
          [...compOptsChanges.entries()].map(([key, value]) => [key, value == null ? null : value])
        );
      }

      if (Object.keys(changes).length) {
        return changes;
      }
    }
  },
};
