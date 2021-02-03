/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import { run } from '@kbn/dev-utils';
import { getInstalledPackages } from '../npm';

import { LICENSE_WHITELIST, DEV_ONLY_LICENSE_WHITELIST, LICENSE_OVERRIDES } from './config';
import { assertLicensesValid } from './valid';

run(
  async ({ log, flags }) => {
    const packages = await getInstalledPackages({
      directory: REPO_ROOT,
      licenseOverrides: LICENSE_OVERRIDES,
      includeDev: !!flags.dev,
    });

    // Assert if the found licenses in the production
    // packages are valid
    assertLicensesValid({
      packages: packages.filter((pkg) => !pkg.isDevOnly),
      validLicenses: LICENSE_WHITELIST,
    });
    log.success('All production dependency licenses are allowed');

    // Do the same as above for the packages only used in development
    // if the dev flag is found
    if (flags.dev) {
      assertLicensesValid({
        packages: packages.filter((pkg) => pkg.isDevOnly),
        validLicenses: LICENSE_WHITELIST.concat(DEV_ONLY_LICENSE_WHITELIST),
      });
      log.success('All development dependency licenses are allowed');
    }
  },
  {
    flags: {
      boolean: ['dev'],
      help: `
        --dev              Also check dev dependencies
      `,
    },
  }
);
