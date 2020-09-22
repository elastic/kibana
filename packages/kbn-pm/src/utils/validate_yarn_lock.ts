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

// @ts-expect-error published types are useless
import { stringify as stringifyLockfile } from '@yarnpkg/lockfile';
import dedent from 'dedent';

import { writeFile } from './fs';
import { Kibana } from './kibana';
import { YarnLock } from './yarn_lock';
import { log } from './log';

export async function assertSingleLodashV4(kbn: Kibana, yarnLock: YarnLock) {
  const lodash4Versions = new Set<string>();
  const lodash4Reqs = new Set<string>();
  for (const [req, dep] of Object.entries(yarnLock)) {
    const chunks = req.split('@');
    if (chunks[0] === 'lodash' && dep.version.startsWith('4.')) {
      lodash4Reqs.add(req);
      lodash4Versions.add(dep.version);
    }
  }

  if (lodash4Versions.size === 1) {
    return;
  }

  for (const req of lodash4Reqs) {
    delete yarnLock[req];
  }

  await writeFile(kbn.getAbsolute('yarn.lock'), stringifyLockfile(yarnLock), 'utf8');

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

export async function assertNoProductionLodash3(kbn: Kibana, yarnLock: YarnLock) {
  const prodDependencies = kbn.resolveAllProductionDependencies(yarnLock, log);

  const lodash3Versions = new Set<string>();
  for (const dep of prodDependencies.values()) {
    if (dep.name === 'lodash' && dep.version.startsWith('3.')) {
      lodash3Versions.add(dep.version);
    }
  }

  if (!lodash3Versions.size) {
    return;
  }

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
