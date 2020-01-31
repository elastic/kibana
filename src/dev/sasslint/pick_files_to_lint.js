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

import fs from 'fs';
import { safeLoad } from 'js-yaml';
import { makeRe } from 'minimatch';
import path from 'path';

// load the include globs from .sass-lint.yml and convert them to regular expressions for filtering files
const sassLintPath = path.resolve(__dirname, '..', '..', '..', '.sass-lint.yml');
const sassLintConfig = safeLoad(fs.readFileSync(sassLintPath));
const {
  files: { include: includeGlobs },
} = sassLintConfig;
const includeRegex = includeGlobs.map(glob => makeRe(glob));

function matchesInclude(file) {
  for (let i = 0; i < includeRegex.length; i++) {
    if (includeRegex[i].test(file.relativePath)) {
      return true;
    }
  }
  return false;
}

export function pickFilesToLint(log, files) {
  return files.filter(file => file.isSass()).filter(matchesInclude);
}
