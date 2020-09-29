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

import { run, createFlagError, REPO_ROOT } from '@kbn/dev-utils';
import { parse } from './parse_owners';
import { flush } from './flush';
import { enumeratePatterns } from './enumerate_patterns';
import { pipe } from '../utils';
import { reduce } from 'rxjs/operators';

const flags = {
  string: ['src', 'dest'],
  help: `
--src              Required, path to CODEOWNERS file.
--dest             Required, destination path of the assignments.
        `,
};

export const generateTeamAssignments = () => {
  run(
    ({ flags, log }) => {
      if (flags.src === '') throw createFlagError('please provide a single --src flag');
      if (flags.dest === '') throw createFlagError('please provide a single --dest flag');

      const logCreepAndFlush = pipe(
        logSuccess(flags.src, log),
        enumeratePatterns(REPO_ROOT)(log),
        flush(flags.dest)(log)
      );

      parse(flags.src).pipe(reduce(toMap, new Map())).subscribe(logCreepAndFlush);
    },
    {
      description: `

Create a file defining the team assignments,
 parsed from .github/CODEOWNERS

      `,
      flags,
    }
  );
};

function toMap(acc, x) {
  acc.set(x[0], x[1][0]);
  return acc;
}

function logSuccess(src, log) {
  return (dataObj) => {
    log.verbose(`\n### Parsing [${src}] Complete`);
    return dataObj;
  };
}
