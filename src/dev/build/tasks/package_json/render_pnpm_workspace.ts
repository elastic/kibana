/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, isScalar, parseDocument } from 'yaml';

// Keep in sync with regenerate_pnpm_workspace.mjs, which owns this block.
const PACKAGES_START = '# START GENERATED PACKAGES';
const PACKAGES_END = '# END GENERATED PACKAGES';

/**
 * Derives the settings-only pnpm-workspace.yaml written into the distributable
 * build dir from the repo's pnpm-workspace.yaml: we drop the generated
 * `packages:` block and keep the authored install settings, allowBuilds and
 * overrides. With no `packages:`, the build dir is its own workspace root, so
 * the in-build install resolves the same hoisted layout + pinned overrides as
 * the repo. Removed afterwards by CleanPackageManagerRelatedFiles.
 */
export function renderPnpmWorkspace(
  rootWorkspaceYaml: string,
  usedDependencyNames?: ReadonlySet<string>
): string {
  const re = new RegExp(`${PACKAGES_START}[\\s\\S]*?${PACKAGES_END}\\n*`);
  if (!re.test(rootWorkspaceYaml)) {
    throw new Error(
      `pnpm-workspace.yaml is missing the "${PACKAGES_START} … ${PACKAGES_END}" markers`
    );
  }
  const rendered = `${rootWorkspaceYaml.replace(re, '').replace(/^\n+/, '').replace(/\n*$/, '')}\n`;
  if (!usedDependencyNames) return rendered;

  const document = parseDocument(rendered);
  const patches = document.get('patchedDependencies', true);
  if (!isMap(patches)) return rendered;

  patches.items = patches.items.filter(({ key }) => {
    if (!isScalar(key) || typeof key.value !== 'string') {
      throw new Error('Dependency patch selectors must be strings');
    }
    const versionSeparator = key.value.lastIndexOf('@');
    const name = versionSeparator > 0 ? key.value.slice(0, versionSeparator) : key.value;
    return usedDependencyNames.has(name);
  });
  if (patches.items.length === 0) document.delete('patchedDependencies');
  return document.toString();
}
