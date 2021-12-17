/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run, createFlagError } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
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

      parse(flags.src)
        .pipe(reduce(toMap, new Map()))
        .subscribe(pipe(enumeratePatterns(REPO_ROOT)(log), flush(flags.dest)));
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
