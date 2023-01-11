/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { getPkgMap } from '@kbn/repo-packages';
import type { ToolingLog } from '@kbn/tooling-log';

const locatePkgsByID = function (inputFilters: string[], log: ToolingLog) {
  const packagesMap = getPkgMap();
  let missingPkgsCount = 0;

  inputFilters.forEach((filterInput) => {
    const pkgId = filterInput.toLowerCase();

    if (packagesMap.has(pkgId)) {
      const pkgLocation = packagesMap.get(pkgId);
      log.success(`pkg ${pkgId} location => ${pkgLocation}`);
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
