/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { findPackageForPath } from '@kbn/repo-packages';

/** `dataViews` -> `Data Views`, `@kbn/scout-reporting` -> `Scout Reporting`, `lens` -> `Lens`. */
export const humanizeModuleId = (id: string): string =>
  id
    .replace(/^@kbn\//, '')
    .split(/[-_/]+|(?<=[a-z0-9])(?=[A-Z])/)
    .filter((word) => word.length > 0)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Human name of the module owning a repo-relative file, from its `kibana.jsonc`: the plugin id
 * for plugins, the package id otherwise. Undefined outside any module, e.g. `test/` or `scripts/`.
 */
export const moduleLabelForPath = (
  repoRelativePath: string,
  repoRoot: string = REPO_ROOT
): string | undefined => {
  const pkg = findPackageForPath(repoRoot, Path.resolve(repoRoot, repoRelativePath));
  if (!pkg) {
    return undefined;
  }
  const manifest = pkg.manifest as { plugin?: { id?: string } };
  return humanizeModuleId(manifest.plugin?.id ?? pkg.id);
};
