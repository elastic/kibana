/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/repo-info';
import { makeMatcher } from '@kbn/picomatcher';
import { type Package, findPackageForPath, getRepoRelsSync } from '@kbn/repo-packages';
import { createFailError } from '@kbn/dev-cli-errors';
import { readPackageJson } from '@kbn/repo-packages';

import { readTsConfig, parseTsConfig, TsConfig } from './ts_configfile';

export type RefableTsProject = TsProject & { rootImportReq: string; pkg: Package };

export interface TsProjectOptions {
  disableTypeCheck?: boolean;
}

type KbnRef = string | { path: string; force?: boolean };
function isValidKbnRefs(refs: unknown): refs is KbnRef[] {
  return (
    Array.isArray(refs) &&
    refs.every(
      (r) =>
        typeof r === 'string' ||
        (typeof r === 'object' && r !== null && 'path' in r && typeof r.path === 'string')
    )
  );
}

function expand(name: string, patterns: string[], knownPaths: string[]) {
  const matchers = patterns.map((pattern) => ({
    pattern,
    matcher: makeMatcher([pattern]),
  }));

  const selected = matchers.map(({ matcher, pattern }) => ({
    pattern,
    matches: knownPaths.filter(matcher),
  }));

  const noMatches = selected.flatMap((s) => (s.matches.length === 0 ? s.pattern : []));
  if (noMatches.length) {
    const list = noMatches.map((p) => `  - ${p}`).join('\n');
    throw new Error(
      `the following tsconfig.json ${name} patterns do not match any tsconfig.json files and should either be updated or removed:\n${list}`
    );
  }

  return new Set(selected.flatMap((s) => s.matches));
}

export class TsProject {
  static loadAll(options: {
    ignore: string[];
    disableTypeCheck: string[];
    noTsconfigPathsRefresh?: boolean;
  }): TsProject[] {
    const mapPath = Path.resolve(__dirname, 'config-paths.json');
    if (!Fs.existsSync(mapPath)) {
      throw new Error('missing config-paths.json file, make sure you run `yarn kbn bootstrap`');
    }

    const tsConfigRepoRels: string[] = JSON.parse(Fs.readFileSync(mapPath, 'utf8'));

    const ignores = expand('ignore', options.ignore, tsConfigRepoRels);
    const disableTypeCheck = expand('disableTypeCheck', options.disableTypeCheck, tsConfigRepoRels);

    const cache = new Map();
    const projects: TsProject[] = [];
    for (const repoRel of tsConfigRepoRels) {
      if (ignores.has(repoRel)) {
        continue;
      }

      const proj = TsProject.createFromCache(cache, Path.resolve(REPO_ROOT, repoRel), {
        disableTypeCheck: disableTypeCheck.has(repoRel),
      });

      if (proj) {
        projects.push(proj);
        continue;
      }

      if (options.noTsconfigPathsRefresh) {
        throw createFailError(
          `Run "yarn kbn bootstrap" to update the tsconfig.json path cache. ${repoRel} no longer exists.`
        );
      }

      // rebuild the tsconfig.json path cache
      const tsConfigPaths = getRepoRelsSync(REPO_ROOT, ['tsconfig.json', '**/tsconfig.json']);
      Fs.writeFileSync(mapPath, JSON.stringify(tsConfigPaths, null, 2));
      return TsProject.loadAll({
        ...options,
        noTsconfigPathsRefresh: true,
      });
    }

    return projects;
  }

  private static createFromCache(
    cache: Map<string, TsProject>,
    abs: string,
    opts?: TsProjectOptions,
    from?: string
  ) {
    const cached = cache.get(abs);
    if (cached) {
      cached._disableTypeCheck = cached._disableTypeCheck || !!opts?.disableTypeCheck;
      return cached;
    }

    try {
      const base = new TsProject(cache, abs, opts);
      cache.set(abs, base);
      return base;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return undefined;
      }

      throw new Error(
        `Failed to load tsconfig file ${from ? `from ${from}` : `at ${abs}`}: ${error.message}`
      );
    }
  }

  /**
   * The parsed config file from disk
   */
  public config: TsConfig;

  /** absolute path to the tsconfig file defininig this project */
  public readonly path: string;
  /** repo relative path to the tsconfig file defininig this project */
  public readonly repoRel: string;
  /** repo relative path to the directory containing this ts project */
  public readonly repoRelDir: string;
  /** The directory containing this ts project */
  public readonly dir: string;
  /** The directory containing this ts project */
  public readonly directory: string;
  /** the package this tsconfig file is within, if any */
  public readonly pkg?: Package;
  /** the package is esm or not */
  public readonly isEsm?: boolean;
  /**
   * if this project is within a package then this will
   * be set to the import request that maps to the root of this project
   */
  public readonly rootImportReq?: string;

  /** absolute path to the tsconfig file that will be generated for type checking this file */
  public readonly typeCheckConfigPath: string;
  /** `true` if we want to explicitly exclude this entire project from type checking */
  private _disableTypeCheck: boolean;

  constructor(
    private readonly cache: Map<string, TsProject>,
    path: string,
    opts?: TsProjectOptions
  ) {
    if (!Path.isAbsolute(path)) {
      throw new Error(`Unable to create ts Project from relative path [${path}]`);
    }

    this.path = path;
    this.config = readTsConfig(this.path);
    this.repoRel = Path.relative(REPO_ROOT, path);
    this.repoRelDir = Path.dirname(this.repoRel);
    this.dir = this.directory = Path.dirname(path);
    this.typeCheckConfigPath = Path.resolve(
      this.directory,
      Path.basename(this.repoRel, '.json') + '.type_check.json'
    );

    this.pkg = findPackageForPath(REPO_ROOT, this.path);
    this.rootImportReq = this.pkg
      ? Path.join(this.pkg.id, Path.relative(this.pkg.directory, this.dir))
      : undefined;

    this._disableTypeCheck = !!opts?.disableTypeCheck;
    this.isEsm = readPackageJson(`${this.dir}/package.json`)?.type === 'module';
  }

  private _name: string | undefined;
  /** name of this project */
  public get name() {
    if (this._name !== undefined) {
      return this._name;
    }

    const basename = Path.basename(this.repoRel);
    if (!this.pkg) {
      return (this._name =
        basename === 'tsconfig.json' ? Path.dirname(this.repoRel) : this.repoRel);
    }

    const id = 'plugin' in this.pkg.manifest ? this.pkg.manifest.plugin.id : this.pkg.manifest.id;
    return (this._name = Path.join(
      id,
      Path.relative(
        this.pkg.directory,
        basename === 'tsconfig.json' ? Path.dirname(this.path) : this.path
      )
    ));
  }

  public isTypeCheckDisabled() {
    return this._disableTypeCheck;
  }

  /**
   * Resolve a path relative to the directory containing this tsconfig.json file
   */
  public resolve(projectRel: string) {
    return Path.resolve(this.directory, projectRel);
  }

  /**
   * updates the project so that the tsconfig file will be
   * read from disk the next time that this.config is accessed
   */
  public reloadFromDisk() {
    this.config = readTsConfig(this.path);
  }

  public overrideConfig(jsonc: string) {
    try {
      this.config = parseTsConfig(this.path, jsonc);
    } catch (error) {
      throw new Error(`unable to parse jsonc in order to override config: ${error.message}`);
    }
  }

  /**
   * Gets the base config file for this tsconfig file. If the
   * "extends" key is not defined this returns undefined
   */
  public getBase(): TsProject | undefined {
    if (!this.config.extends) {
      return undefined;
    }

    return TsProject.createFromCache(
      this.cache,
      Path.resolve(this.directory, this.config.extends),
      {},
      `extends: ${JSON.stringify(this.config.extends)}`
    );
  }

  isRefable(): this is RefableTsProject {
    return !!this.rootImportReq;
  }

  private _importMapCache = new WeakMap<TsProject[], Map<string, RefableTsProject>>();
  private getImportMap(tsProjects: TsProject[]): Map<string, RefableTsProject> {
    const cached = this._importMapCache.get(tsProjects);
    if (cached) {
      return cached;
    }

    const importMap = new Map(
      tsProjects.flatMap((p) => {
        if (p.isRefable()) {
          return [[p.rootImportReq, p]];
        }
        return [];
      })
    );
    this._importMapCache.set(tsProjects, importMap);
    return importMap;
  }

  /**
   * Get the kbnRefs for this project
   */
  public getKbnRefs(tsProjects: TsProject[]): TsProject[] {
    if (!this.config.kbn_references) {
      return [];
    }

    if (!isValidKbnRefs(this.config.kbn_references)) {
      throw new Error(`invalid kbn_references in ${this.name}`);
    }

    const importMap = this.getImportMap(tsProjects);
    return this.config.kbn_references.flatMap((ref) => {
      if (typeof ref !== 'string') {
        return (
          TsProject.createFromCache(
            this.cache,
            Path.resolve(this.directory, ref.path),
            {},
            `kbn_references: ${JSON.stringify(ref)}`
          ) ?? []
        );
      }

      const project = importMap.get(ref);
      if (!project) {
        throw new Error(
          `invalid kbn_references in ${this.name}: ${ref} does not point to another TS project`
        );
      }

      return (
        TsProject.createFromCache(
          this.cache,
          project.path,
          {},
          `kbn_references: ${JSON.stringify(ref)}`
        ) ?? []
      );
    });
  }
}
