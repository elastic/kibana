/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { relative } from 'path';

import { tap, filter, map, toArray } from 'rxjs/operators';

import { scan$, Task } from '../lib';

export const PathLength: Task = {
  description: 'Checking Windows for paths > 200 characters',

  async run(config, log, build) {
    const buildRoot = build.resolvePath();
    await scan$(buildRoot)
      .pipe(
        map((path) => relative(buildRoot, path)),
        filter((relativePath) => relativePath.length > 200),
        toArray(),
        tap((tooLongPaths) => {
          if (!tooLongPaths.length) {
            return;
          }

          throw new Error(
            'Windows has a path limit of 260 characters so we limit the length of paths in Kibana to 200 characters ' +
              ' and the following files exceed this limit:' +
              '\n - ' +
              tooLongPaths.join('\n - ')
          );
        })
      )
      .toPromise();
  },
};
