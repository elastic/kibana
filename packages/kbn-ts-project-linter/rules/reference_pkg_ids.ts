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
import { replaceReferences } from '../ast';

export const refPkgsIds = Rule.create('refPkgIds', {
  check(proj) {
    const dirsToPkgIds = this.getCache(() => {
      const pkgMap = readPackageMap();
      return new Map(Array.from(pkgMap).map(([k, v]) => [v, k]));
    });

    const getPkgId = (tsconfigPath: string) =>
      dirsToPkgIds.get(Path.relative(REPO_ROOT, Path.dirname(tsconfigPath)));

    const replaceWithPkgId: Array<[string, string]> = [];

    for (const ref of proj.config.kbn_references ?? []) {
      if (typeof ref === 'string' || ref.force === true) {
        continue;
      }

      const refPath = Path.resolve(proj.directory, ref.path);
      const pkgIdJson = getPkgId(refPath);
      if (pkgIdJson) {
        replaceWithPkgId.push([ref.path, pkgIdJson]);
      }
    }

    if (!replaceWithPkgId.length) {
      return;
    }

    const list = replaceWithPkgId
      .map(([from, to]) => `  - {"path": "${from}"} => ${JSON.stringify(to)}`)
      .join('\n');

    return {
      msg: `kbn_references must use pkgIds to refer to other packages (use --fix to autofix, or add "force": true to ignore):\n${list}`,
      fix(source) {
        return replaceReferences(source, replaceWithPkgId);
      },
    };
  },
});
