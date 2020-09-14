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

import { readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { REPO_ROOT } from '@kbn/dev-utils';

import {
  push,
  prokGlob,
  trim,
  isBlackListedDir,
  isWhiteListedFile,
  isDir,
  tryPath,
  dropEmpty,
  encoding,
  collectAndLogNotFound,
} from './enumeration_helpers';
import { stripLeading } from '../transforms';

export const enumeratePatterns = (notFoundLogPath) => (log) => (patterns) => {
  const writeToFile = writeFileSync.bind(null, notFoundLogPath);
  const blank = '';
  writeToFile(blank, { encoding });

  const res = [];
  const resPush = push(res);

  for (const entry of patterns) {
    const [pathPattern, teams] = entry;
    const cleaned = stripLeading(pathPattern);
    const owner = teams[0];
    const existsWithOwner = pathExists(owner);

    const collectNotFound = collectAndLogNotFound(writeToFile);
    const collectFound = (x) => existsWithOwner(x).forEach(resPush);
    tryPath(cleaned).fold(collectNotFound(log), collectFound);
  }

  return res;

  function pathExists(owner) {
    const creeper = (x) => creepFsSync(x, [], owner);
    return function creepAllAsGlobs(pathPattern) {
      return prokGlob(pathPattern).map(creeper).filter(dropEmpty);
    };
  }
};

function creepFsSync(aPath, xs, owner) {
  xs = xs || [];

  const joinRoot = join.bind(null, REPO_ROOT);
  const trimRoot = trim(REPO_ROOT);
  const joined = joinRoot(aPath);
  const isADir = isDir(joined);

  (isADir ? readdirSync(joined) : [aPath]).forEach(maybeRecurse);

  return xs;

  function maybeRecurse(entry) {
    const full = isADir ? join(aPath, entry) : entry;
    const fullIsDir = statSync(full).isDirectory();

    if (fullIsDir && !isBlackListedDir(full)) xs = creepFsSync(full, xs, owner);
    else if (isWhiteListedFile(full)) xs.push(`${trimRoot(full)} ${owner}`);
  }
}
