/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { statSync } from 'fs';

import { tap, filter, map, toArray } from 'rxjs';

import { scan$, Task } from '../lib';

export const AssertFileTime: Task = {
  description: 'Checking for files dated before 1980',

  async run(config, log, build) {
    const buildRoot = build.resolvePath();
    await scan$(buildRoot)
      .pipe(
        map((path) => resolve(buildRoot, path)),
        filter((file) => {
          const { atimeMs, mtimeMs, ctimeMs } = statSync(file);
          // tarred files with timestamps before 1970 throw errors
          // zipped files with timestamps before 1980 throw errors
          // round up to 1981 to avoid timezones
          const invalidDate = new Date(1981, 0, 1).getTime();
          return invalidDate > atimeMs || invalidDate > mtimeMs || invalidDate > ctimeMs;
        }),
        toArray(),
        tap((invalidDates) => {
          if (!invalidDates.length) {
            return;
          }

          throw new Error(
            'Archive errors occur with file times before 1980.  The following files have errors:' +
              '\n - ' +
              invalidDates.join('\n - ')
          );
        })
      )
      .toPromise();
  },
};
