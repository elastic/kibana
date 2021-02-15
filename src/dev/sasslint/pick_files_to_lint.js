/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
const includeRegex = includeGlobs.map((glob) => makeRe(glob));

function matchesInclude(file) {
  for (let i = 0; i < includeRegex.length; i++) {
    if (includeRegex[i].test(file.relativePath)) {
      return true;
    }
  }
  return false;
}

export function pickFilesToLint(log, files) {
  return files.filter((file) => file.isSass()).filter(matchesInclude);
}
