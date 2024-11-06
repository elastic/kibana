/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { getPkgsById } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';

const locatePkgsByID = function (inputFilters: string[], log: ToolingLog) {
  const packagesMap = getPkgsById(REPO_ROOT);
  let missingPkgsCount = 0;

  inputFilters.forEach((filterInput) => {
    const pkgId = filterInput.toLowerCase();
    const pkg = packagesMap.get(pkgId);

    if (pkg) {
      log.success(`pkg ${pkgId} location => ${pkg.normalizedRepoRelativeDir}`);
    } else {
      missingPkgsCount++;
      // fail
      log.error(`pkg ${pkgId} NOT FOUND`);
    }
  });

  return missingPkgsCount;
};

run(
  async ({ log, flagsReader }) => {
    const missingPackagesCount = locatePkgsByID(flagsReader.getPositionals(), log);

    if (!missingPackagesCount) {
      log.success('All packages were found successfully');
    } else {
      throw createFailError('see above errors');
    }
  },
  {
    usage: `node scripts/whereis_pkg [...packages]`,
    description: 'Logs where a given package(s) ID is located in the repository',
  }
);
