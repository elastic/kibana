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

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { pluck, flip2 } from '../utils';
import {
  push,
  prokGlob,
  trim,
  isBlackListedDir,
  isWhiteListedFile,
  isDir,
  isExcluded,
  tryPath,
  dropEmpty,
  notFound,
} from './enumeration_helpers';

export const enumeratePatterns = (rootPath) => (log) => (patternsMap) => {
  const res = [];
  const resPush = push(res);
  const logNotFound = notFound(log);

  for (const pattern of patternsMap) {
    const [pathPattern, meta] = pattern;
    const existsWithMeta = pathExists(meta);
    const collect = () => existsWithMeta(pathPattern).forEach(resPush);

    tryPath(pathPattern).fold(logNotFound, collect);
  }

  return res;

  function pathExists(meta) {
    const pluckMeta = flip2(pluck)(meta);
    const [owner, exclusions] = ['coverageOwner', 'excludeFiles'].map(pluckMeta);
    const creeper = (x) => creepFsSync(x, [], rootPath, owner, exclusions);

    return function creepAllAsGlobs(pathPattern) {
      return prokGlob(pathPattern).map(creeper).filter(dropEmpty);
    };
  }
};

function creepFsSync(aPath, xs, rootPath, owner, exclusions) {
  xs = xs || [];

  const joinRoot = join.bind(null, rootPath);
  const trimRoot = trim(rootPath);
  const joined = joinRoot(aPath);
  const isADir = isDir(joined);

  (isADir ? readdirSync(joined) : [aPath]).forEach(maybeRecurse);

  return xs;

  function maybeRecurse(entry) {
    const full = isADir ? join(aPath, entry) : entry;

    if (statSync(full).isDirectory() && !isBlackListedDir(full))
      xs = creepFsSync(full, xs, rootPath, owner, exclusions);
    else if (isWhiteListedFile(full) && !isExcluded(full, exclusions))
      xs.push(`${trimRoot(full)} ${owner}`);
  }
}
