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

// @ts-ignore published types are worthless
import { parse as parseLockfile } from '@yarnpkg/lockfile';

import { readFile } from '../utils/fs';
import { Kibana } from '../utils/kibana';

export interface YarnLock {
  /** a simple map of version@versionrange tags to metadata about a package */
  [key: string]: {
    /** resolved version installed for this pacakge */
    version: string;
    /** resolved url for this pacakge */
    resolved: string;
    /** yarn calculated integrity value for this package */
    integrity: string;
    dependencies?: {
      /** name => versionRange dependencies listed in package's manifest */
      [key: string]: string;
    };
    optionalDependencies?: {
      /** name => versionRange dependencies listed in package's manifest */
      [key: string]: string;
    };
  };
}

export async function readYarnLock(kbn: Kibana): Promise<YarnLock> {
  try {
    const contents = await readFile(kbn.getAbsolute('yarn.lock'), 'utf8');
    const yarnLock = parseLockfile(contents);

    if (yarnLock.type === 'success') {
      return yarnLock.object;
    }

    throw new Error('unable to read yarn.lock file, please run `yarn kbn bootstrap`');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return {};
}
