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

import { run, combineErrors } from './run';
import * as Eslint from './eslint';
import * as Sasslint from './sasslint';
import { getFilesForCommit, checkFileCasing } from './precommit_hook';

run(async ({ log, flags }) => {
  const files = await getFilesForCommit();
  const errors = [];

  try {
    await checkFileCasing(log, files);
  } catch (error) {
    errors.push(error);
  }

  for (const Linter of [Eslint, Sasslint]) {
    const filesToLint = Linter.pickFilesToLint(log, files);
    if (filesToLint.length > 0) {
      try {
        await Linter.lintFiles(log, filesToLint, {
          fix: flags.fix
        });
      } catch (error) {
        errors.push(error);
      }
    }
  }

  if (errors.length) {
    throw combineErrors(errors);
  }
}, {
  description: `
    Run checks on files that are staged for commit
  `,
  flags: {
    boolean: ['fix'],
    default: {
      fix: false
    },
    help: `
      --fix              Execute eslint in --fix mode
    `
  },
});
