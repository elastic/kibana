/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { run } from '@kbn/dev-utils';
import { getInstalledPackages } from '../npm';

import { LICENSE_WHITELIST, DEV_ONLY_LICENSE_WHITELIST, LICENSE_OVERRIDES } from './config';
import { assertLicensesValid } from './valid';
import { REPO_ROOT, X_PACK_ROOT } from '../constants';

run(
  async ({ log, flags }) => {
    const prodPackages = await getInstalledPackages([REPO_ROOT, X_PACK_ROOT], {
      licenseOverrides: LICENSE_OVERRIDES,
      productionOnly: true,
    });

    assertLicensesValid({
      packages: prodPackages,
      validLicenses: LICENSE_WHITELIST,
    });

    log.success('All production dependency licenses are allowed');

    if (flags.dev) {
      const devPackages = await getInstalledPackages([REPO_ROOT, X_PACK_ROOT], {
        licenseOverrides: LICENSE_OVERRIDES,
        developmentOnly: true,
      });

      assertLicensesValid({
        packages: devPackages,
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
