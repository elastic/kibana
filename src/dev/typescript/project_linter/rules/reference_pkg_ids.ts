/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { readPackageMap } from '@kbn/package-map';

import { Rule } from '../lib/rule';

const PATH_RE = /{[^\"]*"path":\s*("[^"]+"),?[^\}]*}/g;

export const refPkgsIds = Rule.create('refPkgIds', {
  check(proj, jsonc) {
    const dirsToPkgIds = this.getCache(() => {
      const pkgMap = readPackageMap();
      return new Map(Array.from(pkgMap).map(([k, v]) => [v, k]));
    });

    const getPkgIdJson = (tsconfigPath: string) => {
      const pkgId = dirsToPkgIds.get(Path.relative(REPO_ROOT, Path.dirname(tsconfigPath)));
      if (pkgId) {
        return JSON.stringify(pkgId);
      }
    };

    const replaceWithPkgId: Array<[string, string]> = [];

    for (const match of jsonc.matchAll(PATH_RE)) {
      const refPath = Path.resolve(proj.directory, JSON.parse(match[1]));
      const pkgIdJson = getPkgIdJson(refPath);
      if (pkgIdJson) {
        replaceWithPkgId.push([match[1], pkgIdJson]);
      }
    }

    if (!replaceWithPkgId.length) {
      return;
    }

    const list = replaceWithPkgId.map(([from, to]) => `  - ${from} => ${to}`).join('\n');
    return {
      msg: `kbn_references must use pkgIds to refer to other packages (use --fix to autofix):\n${list}`,
      fix(source) {
        return source.replaceAll(PATH_RE, (match, jsonPath) => {
          const refPath = Path.resolve(proj.directory, JSON.parse(jsonPath));
          return getPkgIdJson(refPath) ?? match;
        });
      },
    };
  },
});
