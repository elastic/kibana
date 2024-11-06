/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeRe } from 'minimatch';

const includeGlobs = ['**/*.s+(a|c)ss'];
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
