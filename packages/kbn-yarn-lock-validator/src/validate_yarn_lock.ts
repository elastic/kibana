/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import dedent from 'dedent';

import { REPO_ROOT, kibanaPackageJson } from '@kbn/repo-info';
import { SomeDevLog } from '@kbn/some-dev-log';
import { getPackages } from '@kbn/repo-packages';

import { YarnLock, stringifyLockFile } from './yarn_lock';
import { findProductionDependencies } from './find_production_dependencies';

/**
 * Validates the passed yarn.lock file to ensure that we aren't accidentally reproducing
 * specific scenarios we have tried to remove from the codebase.
 */
export async function validateDependencies(log: SomeDevLog, yarnLock: YarnLock) {
  // look through all of the packages in the yarn.lock file to see if
  // we have accidentally installed multiple lodash v4 versions
  const lodash4Versions = new Set<string>();
  const lodash4Reqs = new Set<string>();
  for (const [req, dep] of Object.entries(yarnLock)) {
    if (req.startsWith('lodash@') && dep.version.startsWith('4.')) {
      lodash4Reqs.add(req);
      lodash4Versions.add(dep.version);
    }
  }

  // if we find more than one lodash v4 version installed then delete
  // lodash v4 requests from the yarn.lock file and prompt the user to
  // retry bootstrap so that a single v4 version will be installed
  if (lodash4Versions.size > 1) {
    for (const req of lodash4Reqs) {
      delete yarnLock[req];
    }

    await Fsp.writeFile(Path.resolve(REPO_ROOT, 'yarn.lock'), stringifyLockFile(yarnLock), 'utf8');

    log.error(dedent`

      Multiple version of lodash v4 were detected, so they have been removed
      from the yarn.lock file. Please rerun yarn kbn bootstrap to coalese the
      lodash versions installed.

      If you still see this error when you re-bootstrap then you might need
      to force a new dependency to use the latest version of lodash via the
      "resolutions" field in package.json.

      If you have questions about this please reach out to the operations team.

    `);

    process.exit(1);
  }

  // look through all the dependencies of production packages and production
  // dependencies of those packages to determine if we're shipping any versions
  // of lodash v3 in the distributable
  const prodDependencies = findProductionDependencies(log, yarnLock)!;
  const lodash3Versions = new Set<string>();
  for (const dep of prodDependencies.values()) {
    if (dep.name === 'lodash' && dep.version.startsWith('3.')) {
      lodash3Versions.add(dep.version);
    }
  }
  // if any lodash v3 packages were found we abort and tell the user to fix things
  if (lodash3Versions.size) {
    log.error(dedent`

      Due to changes in the yarn.lock file and/or package.json files a version of
      lodash 3 is now included in the production dependencies. To reduce the size of
      our distributable and especially our front-end bundles we have decided to
      prevent adding any new instances of lodash 3.

      Please inspect the changes to yarn.lock or package.json files to identify where
      the lodash 3 version is coming from and remove it.

      If you have questions about this please reack out to the operations team.

    `);

    process.exit(1);
  }

  // look for packages that have the the `kibana.devOnly` flag in their package.json
  // and make sure they aren't included in the production dependencies of Kibana
  const pkgs = getPackages(REPO_ROOT);
  const devOnlyPackagesInProduction = pkgs.flatMap((p) =>
    p.isDevOnly() && Object.hasOwn(kibanaPackageJson.dependencies, p.manifest.id)
      ? p.manifest.id
      : []
  );
  if (devOnlyPackagesInProduction.length) {
    log.error(dedent`
      Some of the packages in the production dependency chain for Kibana and X-Pack are
      flagged with "devOnly" in their package.json. Please check changes made to
      packages and their dependencies to ensure they don't end up in production.

      The devOnly dependencies that are being dependend on in production are:

        - ${devOnlyPackagesInProduction.join('\n  - ')}
    `);

    process.exit(1);
  }

  log.success('yarn.lock analysis completed without any issues');
}
