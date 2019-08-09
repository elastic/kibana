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


import { fromRoot } from '../../../legacy/utils';
import { chain } from 'lodash';
import { resolve } from 'path';
import { fromNode } from 'bluebird';
import glob from 'glob-all';

const findSourceFiles = async (patterns, cwd = fromRoot('.')) => {
  patterns = [].concat(patterns || []);

  const matches = await fromNode(cb => {
    glob(patterns, {
      cwd: cwd,
      ignore: [
        'node_modules/**/*',
        'bower_components/**/*',
        '**/_*.js',
        '**/*.test.js',
        '**/*.test.mocks.js',
        '**/__mocks__/**/*',
      ],
      symlinks: findSourceFiles.symlinks,
      statCache: findSourceFiles.statCache,
      realpathCache: findSourceFiles.realpathCache,
      cache: findSourceFiles.cache
    }, cb);
  });

  return chain(matches)
    .flatten()
    .uniq()
    .map(match => resolve(cwd, match))
    .value();
};

findSourceFiles.symlinks = {};
findSourceFiles.statCache = {};
findSourceFiles.realpathCache = {};
findSourceFiles.cache = {};

export default findSourceFiles;
