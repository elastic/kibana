/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import Resolve from 'resolve';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages, type Package } from '@kbn/repo-packages';

import { safeStat, readFileSync } from './helpers/fs';
import { ResolveResult } from './resolve_result';
import { getRelativeImportReq } from './helpers/import_req';
import { memoize } from './helpers/memoize';

const NODE_MODULE_SEG = Path.sep + 'node_modules' + Path.sep;

export class ImportResolver {
  static create(repoRoot: string, packages: Package[] = getPackages(repoRoot)) {
    return new ImportResolver(repoRoot, new Map(packages.map((p) => [p.id, p])));
  }

  private safeStat = memoize(safeStat);

  private baseResolveOpts = {
    extensions: ['.js', '.json', '.ts', '.tsx', '.d.ts'],
    isFile: (path: string) => !!this.safeStat(path)?.isFile(),
    isDirectory: (path: string) => !!this.safeStat(path)?.isDirectory(),
    readFileSync: memoize(readFileSync),
    packageFilter(pkg: Record<string, unknown>) {
      if (!pkg.main && pkg.types) {
        // for the purpose of resolving files, a "types" file is adequate
        return {
          ...pkg,
          main: pkg.types,
        };
      }

      return pkg;
    },
  };

  constructor(
    /**
     * Root directory that all source files for packages are expected to be
     * in, also the directory that package maps are resolved against.
     */
    private readonly cwd: string,
    /**
     * Map of package ids to normalized root-relative directories
     * for each package
     */
    private readonly pkgsById: Map<string, Package>
  ) {
    this._dirToPkg = new Map(
      Array.from(this.pkgsById.values()).map((p) => [p.normalizedRepoRelativeDir, p])
    );
  }

  /**
   * map of repoRels and the packages they point to or are contained within.
   * This map is initially populated with the position of the packages, and
   * from then on serves as a cache for `pkgForDir(dir)`
   */
  private readonly _dirToPkg: Map<string, Package | null>;
  private pkgForDir(dir: string): Package | null {
    const cached = this._dirToPkg.get(dir);
    if (cached !== undefined) {
      return cached;
    }

    const parent = Path.dirname(dir);
    if (parent === '.') {
      this._dirToPkg.set(dir, null);
      return null;
    }

    const pkgId = this.pkgForDir(parent);
    this._dirToPkg.set(dir, pkgId);
    return pkgId;
  }

  getPackageIdForPath(path: string) {
    const relative = Path.relative(this.cwd, path);
    if (relative.startsWith('..') || path.includes(NODE_MODULE_SEG)) {
      return null;
    }

    return this.pkgForDir(Path.dirname(relative))?.id ?? null;
  }

  getPackageManifestForPath(path: string) {
    const pkgId = this.getPackageIdForPath(path);
    return pkgId ? this.getPkgManifest(pkgId) : undefined;
  }

  getAbsolutePackageDir(pkgId: string) {
    return this.pkgsById.get(pkgId)?.directory ?? null;
  }

  isRepoPkg(pkgId: string) {
    return this.pkgsById.has(pkgId);
  }

  getPkgManifest(pkgId: string) {
    return this.pkgsById.get(pkgId)?.manifest;
  }

  private shouldIgnore(req: string): boolean {
    // this library is only installed on CI and never resolvable
    if (req === 'kibana-buildkite-library') {
      return true;
    }

    // these are special webpack-aliases only used in storybooks, ignore them
    if (req === 'core_styles' || req === 'core_app_image_assets') {
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

      const pkgId = this.getPackageIdForPath(path);
      if (pkgId) {
        return {
          type: 'file',
          absolute: path,
          pkgId,
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
    // transform webpack loader requests and focus on the actual file selected
    const lastExI = req.lastIndexOf('!');
    const quesI = req.lastIndexOf('?');
    if (lastExI > -1 || quesI > -1) {
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
      const pkgDir = this.getAbsolutePackageDir(pkgId);
      if (pkgDir) {
        return this.resolve(
          `./${Path.relative(
            dirname,
            parts.length > 2 ? Path.resolve(pkgDir, ...parts.slice(2)) : pkgDir
          )}`,
          dirname
        );
      }
    }

    req = this.adaptReq(req, dirname) ?? req;

    if (this.shouldIgnore(req)) {
      return { type: 'ignore' };
    }

    return this.tryNodeResolve(req, dirname) ?? this.tryTypesResolve(req, dirname);
  }
}
