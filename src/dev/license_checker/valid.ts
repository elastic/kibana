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

import dedent from 'dedent';
import { createFailError } from '../run';

interface Options {
  packages: Array<{
    name: string;
    version: string;
    relative: string;
    licenses: string[];
  }>;
  validLicenses: string[];
}

/**
 *  When given a list of packages and the valid license
 *  options, either throws an error with details about
 *  violations or returns undefined.
 */
export function assertLicensesValid({ packages, validLicenses }: Options) {
  const invalidMsgs = packages.reduce(
    (acc, pkg) => {
      const invalidLicenses = pkg.licenses.filter(license => !validLicenses.includes(license));

      if (pkg.licenses.length && !invalidLicenses.length) {
        return acc;
      }

      return acc.concat(dedent`
        ${pkg.name}
          version: ${pkg.version}
          all licenses: ${pkg.licenses}
          invalid licenses: ${invalidLicenses.join(', ')}
          path: ${pkg.relative}
      `);
    },
    [] as string[]
  );

  if (invalidMsgs.length) {
    throw createFailError(
      `Non-conforming licenses:\n${invalidMsgs
        .join('\n')
        .split('\n')
        .map(l => `  ${l}`)
        .join('\n')}`
    );
  }
}
