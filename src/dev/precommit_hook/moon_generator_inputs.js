/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

const MOON_GENERATOR_INPUTS = new Set([
  'moon.yml',
  'moon.extend.yml',
  'kibana.jsonc',
  'tsconfig.json',
  'package.json',
  'jest.config.js',
  'jest.config.cjs',
  'jest.config.json',
]);

export function isMoonGeneratorInput(relativePath) {
  return MOON_GENERATOR_INPUTS.has(path.basename(relativePath));
}

export function getMoonAffectedProjectNames(relativePaths, dependencyLookup) {
  const dirs = [];
  for (const relativePath of relativePaths) {
    if (!isMoonGeneratorInput(relativePath)) {
      continue;
    }
    const dir = path.dirname(relativePath);
    if (dir && dir !== '.' && !dirs.includes(dir)) {
      dirs.push(dir);
    }
  }

  return dirs.flatMap((dir) => {
    const projectName = dependencyLookup[dir];
    return projectName ? [projectName] : [];
  });
}
