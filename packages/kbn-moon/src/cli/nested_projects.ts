/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Moon marks every project whose directory contains a changed file as affected,
 * so a project nested inside another one also marks its ancestor.
 * Do not add new entries: https://github.com/elastic/kibana/issues/286372
 */
export const NESTED_PROJECT_ANCESTORS_ALLOWLIST: readonly string[] = [
  'src/platform/packages/shared/kbn-esql-resource-browser',
  'src/platform/plugins/private/interactive_setup',
  'src/platform/test',
  'x-pack/platform/plugins/shared/fleet',
  'x-pack/platform/plugins/shared/ml',
  'x-pack/platform/plugins/shared/osquery',
  'x-pack/platform/test',
  'x-pack/solutions/security/test',
  'x-pack/solutions/security/test/security_solution_api_integration',
];

/** Returns `ancestor -> nested` directory pairs whose ancestor is not allowlisted. */
export const findNestedProjects = (
  projectDirs: readonly string[],
  allowlist: readonly string[] = NESTED_PROJECT_ANCESTORS_ALLOWLIST
): string[] => {
  const dirs = new Set(projectDirs);
  const allowed = new Set(allowlist);
  const nested: string[] = [];

  for (const dir of [...dirs].sort()) {
    const segments = dir.split('/');
    for (let i = 1; i < segments.length; i++) {
      const ancestor = segments.slice(0, i).join('/');
      if (dirs.has(ancestor) && !allowed.has(ancestor)) {
        nested.push(`${ancestor} -> ${dir}`);
      }
    }
  }

  return nested;
};
