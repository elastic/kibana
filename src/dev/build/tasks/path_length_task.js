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

import { relative } from 'path';

import { tap, filter, map, toArray } from 'rxjs/operators';

import { scan$ } from '../lib/scan';

export const PathLengthTask = {
  description: 'Checking Windows for paths > 200 characters',

  async run(config, log, build) {
    const buildRoot = build.resolvePath();
    await scan$(buildRoot)
      .pipe(
        map(path => relative(buildRoot, path)),
        filter(relativePath => relativePath.length > 200),
        toArray(),
        tap(tooLongPaths => {
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
