/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Returns `ancestor -> nested` directory pairs. */
export const findNestedProjects = (projectDirs: readonly string[]): string[] => {
  const dirs = new Set(projectDirs);
  const nested: string[] = [];

  for (const dir of [...dirs].sort()) {
    const segments = dir.split('/');
    for (let i = 1; i < segments.length; i++) {
      const ancestor = segments.slice(0, i).join('/');
      if (dirs.has(ancestor)) {
        nested.push(`${ancestor} -> ${dir}`);
      }
    }
  }

  return nested;
};
