/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import Resolve from 'resolve';
import { REPO_ROOT } from '@kbn/utils';
import normalizePath from 'normalize-path';
import { discoverBazelPackageLocations } from '@kbn/bazel-packages';
import { readPackageMap, PackageMap } from '@kbn/synthetic-package-map';

import { safeStat, readFileSync } from './helpers/fs';
import { ResolveResult } from './resolve_result';
import { getRelativeImportReq } from './helpers/import_req';
import { memoize } from './helpers/memoize';

const NODE_MODULE_SEG = Path.sep + 'node_modules' + Path.sep;

const IGNORE_RESULT: ResolveResult = { type: 'ignore' };

interface ImportResolverOptions {
  disableTypesFallback?: boolean;
}

export class ImportResolver {
  static create(repoRoot: string, options?: ImportResolverOptions) {
    const pkgMap = new Map();
    for (const dir of discoverBazelPackageLocations(repoRoot)) {
      const pkg = JSON.parse(Fs.readFileSync(Path.resolve(dir, 'package.json'), 'utf8'));
      pkgMap.set(pkg.name, normalizePath(Path.relative(repoRoot, dir)));
    }

    return new ImportResolver(repoRoot, pkgMap, readPackageMap(), options);
  }

  private readonly safeStat = memoize(safeStat);
  private readonly baseResolveOpts: Resolve.SyncOpts;
  private readonly fallbackToTypes: boolean;
  private readonly resolveCache = new Map<string, ResolveResult | null>();

  constructor(
    /**
     * Root directory that all source files for packages are expected to be
     * in, also the directory that package maps are resolved against.
     */
    private readonly cwd: string,
    /**
     * Map of actual package names to normalized root-relative directories
     * for each package
     */
    private readonly pkgMap: PackageMap,
    /**
     * Map of synthetic package names to normalized root-relative directories
     * for each simulated package
     */
    private readonly synthPkgMap: PackageMap,
    /**
     * Options to tweak ImportResolver behavior
     */
    options?: ImportResolverOptions
  ) {
    this.fallbackToTypes = options?.disableTypesFallback !== true;
    this.baseResolveOpts = {
      extensions: ['.js', '.json', '.ts', '.tsx', '.d.ts'],
      preserveSymlinks: true,
      isFile: (path) => !!this.safeStat(path)?.isFile(),
      isDirectory: (path) => !!this.safeStat(path)?.isDirectory(),
      readFileSync: memoize(readFileSync),
      packageFilter: this.fallbackToTypes
        ? (pkg) => {
            if (pkg.main && pkg.types) {
              // for the purpose of resolving files, a "types" file is adequate
              return {
                ...pkg,
                main: pkg.types,
              };
            }

            return pkg;
          }
        : undefined,
    };
  }

  getPackageIdForPath(path: string) {
    const relative = normalizePath(Path.relative(this.cwd, path));
    if (relative.startsWith('..')) {
      throw new Error(`path is outside of cwd [${this.cwd}]`);
    }

    for (const [synthPkgId, dir] of this.synthPkgMap) {
      if (relative === dir || relative.startsWith(dir + '/')) {
        return synthPkgId;
      }
    }

    for (const [pkgId, dir] of this.pkgMap) {
      if (relative === dir || relative.startsWith(dir + '/')) {
        return pkgId;
      }
    }

    return null;
  }

  getAbsolutePackageDir(pkgId: string) {
    const dir = this.synthPkgMap.get(pkgId) ?? this.pkgMap.get(pkgId);
    if (!dir) {
      return null;
    }
    return Path.resolve(this.cwd, dir);
  }

  isBazelPackage(pkgId: string) {
    return this.pkgMap.has(pkgId);
  }

  isSyntheticPackage(pkgId: string) {
    return this.synthPkgMap.has(pkgId);
  }

  private isIgnorable(req: string): boolean {
    // this library is only installed on CI and never resolvable
    if (req === 'kibana-buildkite-library') {
      return true;
    }

    // these are special webpack-aliases only used in storybooks, ignore them
    if (req === 'core_styles' || req === 'core_app_image_assets') {
      return true;
    }

    // ignore amd require done by ace syntax plugin
    if (req === 'ace/lib/dom') {
      return true;
    }

    // ignore requests to grammar/built_grammar.js files or bazel target dirs, these files are only
    // available in the build output and will never resolve in dev. We will validate that people don't
    // import these files from outside the package in another rule
    if (
      req.endsWith('grammar/built_grammar.js') ||
      req.includes('/target_workers/') ||
      req.includes('/target_node/')
    ) {
      return true;
    }

    // typescript validates these imports fine and they're purely virtual thanks to ambient type definitions in @elastic/eui so /shrug
    if (
      req.startsWith('@elastic/eui/src/components/') ||
      req.startsWith('@elastic/eui/src/services/')
    ) {
      return true;
    }

    return false;
  }

  private adaptReq(req: string, dirname: string): string | undefined {
    // handle typescript aliases
    if (req === 'kibana/public') {
      return this.adaptReq('src/core/public', dirname);
    }
    if (req === 'kibana/server') {
      return this.adaptReq('src/core/server', dirname);
    }

    // turn root-relative paths into relative paths
    if (
      req.startsWith('src/') ||
      req.startsWith('x-pack/') ||
      req.startsWith('examples/') ||
      req.startsWith('test/')
    ) {
      return getRelativeImportReq({
        dirname,
        absolute: Path.resolve(REPO_ROOT, req),
        type: 'esm',
      });
    }
  }

  private tryNodeResolve(req: string, dirname: string): ResolveResult | null {
    try {
      const path = Resolve.sync(req, {
        basedir: dirname,
        ...this.baseResolveOpts,
      });

      if (!Path.isAbsolute(path)) {
        return {
          type: 'built-in',
        };
      }

      const lastNmSeg = path.lastIndexOf(NODE_MODULE_SEG);
      if (lastNmSeg !== -1) {
        const segs = path.slice(lastNmSeg + NODE_MODULE_SEG.length).split(Path.sep);
        const moduleId = segs[0].startsWith('@') ? `${segs[0]}/${segs[1]}` : segs[0];

        return {
          type: 'file',
          absolute: path,
          nodeModule: moduleId,
        };
      }

      return {
        type: 'file',
        absolute: path,
      };
    } catch (error) {
      if (error && error.code === 'MODULE_NOT_FOUND') {
        if (req === 'fsevents') {
          return {
            type: 'optional-and-missing',
          };
        }
        return null;
      }

      throw error;
    }
  }

  private tryTypesResolve(req: string, dirname: string): ResolveResult | null {
    const parts = req.split('/');
    const nmParts = parts[0].startsWith('@') ? [parts[0].slice(1), parts[1]] : [parts[0]];
    const typesReq = `@types/${nmParts.join('__')}`;
    const result = this.tryNodeResolve(typesReq, dirname);

    if (result) {
      return {
        type: '@types',
        module: typesReq,
      };
    }

    return null;
  }

  /**
   * Resolve an import request from a file in the given dirname
   */
  resolve(req: string, dirname: string): ResolveResult | null {
    const key = `${req}:${dirname}`;
    const cached = this.resolveCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = this.uncachedResolve(req, dirname);
    this.resolveCache.set(key, result);
    return result;
  }

  private uncachedResolve(req: string, dirname: string): ResolveResult | null {
    // transform webpack loader requests and focus on the actual file selected
    const lastExI = req.lastIndexOf('!');
    if (lastExI > -1) {
      const quesI = req.lastIndexOf('?');
      const prefix = req.slice(0, lastExI + 1);
      const postfix = quesI > -1 ? req.slice(quesI) : '';
      const result = this.resolve(req.slice(lastExI + 1, quesI > -1 ? quesI : undefined), dirname);

      if (result?.type !== 'file') {
        return result;
      }

      return {
        ...result,
        prefix,
        postfix,
      };
    }

    if (req[0] !== '.') {
      const parts = req.split('/');
      const pkgId = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : `${parts[0]}`;
      if (this.synthPkgMap.has(pkgId)) {
        const pkgDir = this.getAbsolutePackageDir(pkgId);
        if (pkgDir) {
          return this.resolve(
            getRelativeImportReq({
              absolute: parts.length > 2 ? Path.resolve(pkgDir, ...parts.slice(2)) : pkgDir,
              dirname,
              type: 'esm',
            }),
            dirname
          );
        }
      }
    }

    req = this.adaptReq(req, dirname) ?? req;

    return (
      this.tryNodeResolve(req, dirname) ??
      (this.fallbackToTypes ? this.tryTypesResolve(req, dirname) : null) ??
      (this.isIgnorable(req) ? IGNORE_RESULT : null)
    );
  }
}
