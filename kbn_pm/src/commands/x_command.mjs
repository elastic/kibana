/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import External from '../lib/external_packages.js';
import { REPO_ROOT } from '../lib/paths.mjs';

/** @type {import('../lib/command').Command} */
export const command = {
  name: '_x',
  async run({ log }) {
    const { readPackageMap } = External['@kbn/package-map']();

    const { PROJECTS } = /** @type {import('../../../src/dev/typescript/projects')} */ (
      External.reqAbs(Path.resolve(REPO_ROOT, 'src/dev/typescript/projects.ts'))
    );

    const pkgMap = readPackageMap();
    const pkgDirMap = new Map(Array.from(pkgMap).map(([k, v]) => [v, k]));
    let updateCount = 0;

    for (const proj of PROJECTS) {
      const jsonc = Fs.readFileSync(proj.tsConfigPath, 'utf8');
      const withReplacements = jsonc.replaceAll(
        /{[^\"]*"path":\s*("[^"]+"),?[^\}]*}/g,
        (match, jsonPath) => {
          const refPath = Path.resolve(proj.directory, JSON.parse(jsonPath));
          const repoRelRef = Path.relative(REPO_ROOT, Path.dirname(refPath));

          const pkgId = pkgDirMap.get(repoRelRef);
          if (!pkgId) {
            log.error('unable to map', refPath, 'to a package id');
            return match;
          }

          return JSON.stringify(pkgId);
        }
      );

      if (withReplacements !== jsonc) {
        Fs.writeFileSync(proj.tsConfigPath, withReplacements, 'utf8');
        updateCount++;
      }
    }

    log.success('updated', updateCount, 'tsconfig.json files');
  },
};
