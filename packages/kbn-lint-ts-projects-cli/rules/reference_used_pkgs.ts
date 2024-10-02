/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncForEachWithLimit } from '@kbn/std';
import { addReferences, removeReferences, removeAllReferences } from '@kbn/json-ast';

import { TS_PROJECTS, type RefableTsProject } from '@kbn/ts-projects';
import { parseKbnImportReq } from '@kbn/repo-packages';
import { TsProjectRule } from '@kbn/repo-linter';
import { ImportLocator } from '@kbn/import-locator';

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
  };
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

    const { importLocator, importableTsProjects, tsProjectsByRootImportReq } =
      this.getCache(createCache);

    const usedTsProjects = new Set<RefableTsProject>();
    await asyncForEachWithLimit(this.getAllFiles(), 30, async (path) => {
      const reqs = Array.from(await importLocator.read(path.abs)).flatMap(
        (req) => parseKbnImportReq(req) ?? []
      );

      for (const req of reqs) {
        const options = importableTsProjects.get(req.pkgId);
        if (!options) {
          continue;
        }

        if (!Array.isArray(options)) {
          usedTsProjects.add(options);
          continue;
        }

        for (const opt of options) {
          if (req.full.startsWith(opt.rootImportReq)) {
            usedTsProjects.add(opt);
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
