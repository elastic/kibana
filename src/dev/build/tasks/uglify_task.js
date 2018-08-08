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

import uglifyjs from 'uglify-es';
import composer from 'gulp-uglify/composer';
import vfs from 'vinyl-fs';

import { createPromiseFromStreams } from '../../../utils';

export const UglifyTask = {
  description: 'Minimizing sources with uglify',

  async run(config, log, build) {
    const gulpUglify = composer(uglifyjs, console);

    await createPromiseFromStreams([
      vfs.src(
        [
          '**/*.js',
          '!**/public/**',
          '!**/node_modules/**',
          '!**/webpackShims/**',
        ],
        {
          cwd: build.resolvePath(),
        }
      ),

      gulpUglify({}),

      vfs.dest(build.resolvePath()),
    ]);
  },
};
