/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { KibanaPackageJson } from '@kbn/repo-info';
import { parse } from 'yaml';

type LocalFileDependenciesManifest = Partial<
  Pick<
    KibanaPackageJson,
    'dependencies' | 'devDependencies' | 'optionalDependencies' | 'resolutions'
  >
>;

export function getLocalFileDependencyPaths(
  pkg: LocalFileDependenciesManifest,
  workspaceYaml: string
): string[] {
  const workspace = parse(workspaceYaml) as {
    overrides?: Record<string, string>;
  };
  const specifiers = [
    ...Object.values(pkg.dependencies ?? {}),
    ...Object.values(pkg.devDependencies ?? {}),
    ...Object.values(pkg.optionalDependencies ?? {}),
    ...Object.values(pkg.resolutions ?? {}),
    ...Object.values(workspace.overrides ?? {}),
  ];

  return [
    ...new Set(
      specifiers.flatMap((specifier) =>
        typeof specifier === 'string' && specifier.startsWith('file:')
          ? [toRepoRelativePath(specifier)]
          : []
      )
    ),
  ];
}

function toRepoRelativePath(specifier: string): string {
  const dependencyPath = specifier.slice('file:'.length);
  const normalized = Path.normalize(dependencyPath);
  if (
    !dependencyPath ||
    Path.isAbsolute(dependencyPath) ||
    normalized === '..' ||
    normalized.startsWith(`..${Path.sep}`)
  ) {
    throw new Error(`local dependency must reference a file inside the repository: ${specifier}`);
  }

  return normalized;
}
