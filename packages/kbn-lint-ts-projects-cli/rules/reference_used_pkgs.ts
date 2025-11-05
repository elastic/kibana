/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { asyncForEachWithLimit } from '@kbn/std';
import { addReferences, removeReferences, removeAllReferences } from '@kbn/json-ast';

import { TS_PROJECTS, type RefableTsProject } from '@kbn/ts-projects';
import { parseKbnImportReq } from '@kbn/repo-packages';
import { TsProjectRule } from '@kbn/repo-linter';
import { ImportLocator } from '@kbn/import-locator';

type NormDirRefableTsProject = RefableTsProject & { normalizedDir: string };

// little helper for resolveRelativeImportOwner
const resolvedPathCache = new Map<string, string>();
function resolvePathCached(fromDir: string, rel: string): string {
  const key = `${fromDir}|${rel}`;
  let val = resolvedPathCache.get(key);
  if (!val) {
    val = Path.resolve(fromDir, rel);
    resolvedPathCache.set(key, val);
  }
  return val;
}

function createCache() {
  const importable = new Map<string, Set<RefableTsProject>>();

  for (const proj of TS_PROJECTS) {
    if (!proj.isRefable()) {
      continue;
    }

    const req = parseKbnImportReq(proj.rootImportReq);
    if (!req) {
      continue;
    }

    const pkgId = req.pkgId;
    const existing = importable.get(pkgId);
    if (existing) {
      existing.add(proj);
    } else {
      importable.set(pkgId, new Set([proj]));
    }
  }

  const refableProjects = TS_PROJECTS.filter((p) => p.isRefable())
    // sort longest directory first so we can early return on match
    .sort((a, b) => b.directory.length - a.directory.length)
    .map((p) => ({
      ...p,
      normalizedDir: p.directory.split(Path.sep).join('/'),
    })) as NormDirRefableTsProject[];

  return {
    importLocator: new ImportLocator(),
    tsProjectsByRootImportReq: new Map(
      TS_PROJECTS.flatMap((p) => (p.isRefable() ? [[p.rootImportReq, p]] : []))
    ),
    importableTsProjects: new Map(
      Array.from(importable, ([k, v]) => {
        const projects = Array.from(v).sort((a, b) => b.directory.localeCompare(a.directory));
        return [k, projects.length === 1 ? projects[0] : projects];
      })
    ),
    refableProjects,
  };
}

// NOTE: helper function to help enriching discovered imports across relative paths.
// There are places where a single package owns a top level ts project and then a child ts project
// usually for cypress/testing purposes. This was not something we anticipated for before but its
// likely those are being used to separate from the main package typecheck things that are not useful.
//
// It still appears useful that we can detect working cases where relative
// imports go out of the working package because of the above situation. We have eslint rules in place
// to avoid those situations, but they don't account for the fact that a true package could hold
// multiple sub typescript projects.
//
// This function given an absolute file path and a relative import string,
// return the owning RefableTsProject (if any).
function resolveRelativeImportOwner(
  importPath: string,
  fromPath: string,
  refableProjects: NormDirRefableTsProject[]
): RefableTsProject | undefined {
  if (!importPath.startsWith('.')) return undefined;

  const sep = Path.sep;
  const resolved = resolvePathCached(Path.dirname(fromPath), importPath);
  const resolvedNorm = resolved.split(Path.sep).join(sep);

  for (const proj of refableProjects) {
    const dir = proj.normalizedDir;
    if (resolvedNorm === dir || resolvedNorm.startsWith(dir + sep)) {
      // early return since we sorted by depth
      return proj;
    }
  }

  return undefined;
}

export const referenceUsedPkgs = TsProjectRule.create('referenceUsedPkgs', {
  async check({ tsProject }) {
    if (tsProject.isTypeCheckDisabled()) {
      if (!tsProject.config.kbn_references) {
        return;
      }

      return {
        msg: 'type checking is disabled, so kbn_references is unnecessary and not kept up-to-date.',
        fixes: {
          'tsconfig.json': (source) => removeAllReferences(source),
        },
      };
    }

    const { importLocator, importableTsProjects, tsProjectsByRootImportReq, refableProjects } =
      this.getCache(createCache);

    const usedTsProjects = new Set<RefableTsProject>();
    await asyncForEachWithLimit(this.getAllFiles(), 30, async (path) => {
      const rawImports = Array.from(await importLocator.read(path.abs));
      const enrichedImports = new Set<string>();

      for (const imp of rawImports) {
        if (imp.startsWith('.')) {
          // try mapping relative imports to its own package id import
          const owner = resolveRelativeImportOwner(imp, path.abs, refableProjects);
          if (owner) {
            enrichedImports.add(owner.rootImportReq);
            continue;
          }
        }
        enrichedImports.add(imp);
      }

      const reqs = Array.from(enrichedImports).flatMap((req) => parseKbnImportReq(req) ?? []);

      for (const req of reqs) {
        const options = importableTsProjects.get(req.pkgId);
        if (!options) {
          continue;
        }

        const forcedArrOptions = Array.isArray(options) ? options : [options];
        for (const opt of forcedArrOptions) {
          // avoid partial matches like kbn/es matching kbn/esql
          const prefix = opt.rootImportReq.endsWith('/')
            ? opt.rootImportReq
            : opt.rootImportReq + '/';

          if (req.full === opt.rootImportReq || req.full.startsWith(prefix)) {
            if (opt !== tsProject) {
              // skip self-imports
              usedTsProjects.add(opt);
            }
            // stop after first match as before
            break;
          }
        }
      }
    });

    const refs = new Set(
      (tsProject.config.kbn_references ?? []).flatMap((r) =>
        typeof r === 'string' ? tsProjectsByRootImportReq.get(r) || r : []
      )
    );
    const missing = new Set<RefableTsProject>();
    const extra = new Set<RefableTsProject | string>(refs);
    for (const used of usedTsProjects) {
      extra.delete(used);
      if (!refs.has(used)) {
        missing.add(used);
      }
    }

    if (missing.size) {
      const ids = Array.from(missing, (p) => p.rootImportReq);
      const list = ids.map((id) => `  - ${id}`).join('\n');
      this.err(
        `the following packages are referenced in the code of this package but not listed in kbn_references:\n${list}`,
        {
          'tsconfig.json': (source) => addReferences(source, ids),
        }
      );
    }

    if (extra.size) {
      const ids = Array.from(extra, (p) => (typeof p === 'string' ? p : p.rootImportReq));
      const list = ids.map((id) => `  - ${id}`).join('\n');
      this.err(
        `the following packages are listed in kbn_references but there are no detectable references in the code:\n${list}`,
        {
          'tsconfig.json': (source) => removeReferences(source, ids),
        }
      );
    }
  },
});
