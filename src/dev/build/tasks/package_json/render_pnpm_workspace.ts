/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Keep in sync with regenerate_pnpm_workspace.mjs, which owns this block.
const PACKAGES_START = '# START GENERATED PACKAGES';
const PACKAGES_END = '# END GENERATED PACKAGES';

const PATCHED_DEPENDENCIES_BLOCK = /^patchedDependencies:\n((?:[ \t]+.*\n?)*)/m;
// `  vitest@5.0.2: patches/vitest@5.0.2.patch` -> name `vitest`, path `patches/...`
const PATCH_ENTRY = /^\s+['"]?((?:@[^/\s]+\/)?[^@\s'"]+)@[^:]*['"]?:\s*['"]?([^'"\s]+)['"]?\s*$/;

export interface RenderedPnpmWorkspace {
  yaml: string;
  /** Repo-relative patch files the build's install needs next to its pnpm-workspace.yaml */
  patchFiles: string[];
}

/**
 * Derives the settings-only pnpm-workspace.yaml written into the distributable
 * build dir from the repo's pnpm-workspace.yaml: we drop the generated
 * `packages:` block and keep the authored install settings, allowBuilds and
 * overrides. With no `packages:`, the build dir is its own workspace root, so
 * the in-build install resolves the same hoisted layout + pinned overrides as
 * the repo. Removed afterwards by CleanPackageManagerRelatedFiles.
 *
 * `patchedDependencies` entries are kept only for dependencies the build installs
 * (pnpm fails on patches of absent packages); their patch files must be copied too.
 */
export function renderPnpmWorkspace(
  rootWorkspaceYaml: string,
  isInstalled: (dependencyName: string) => boolean
): RenderedPnpmWorkspace {
  const re = new RegExp(`${PACKAGES_START}[\\s\\S]*?${PACKAGES_END}\\n*`);
  if (!re.test(rootWorkspaceYaml)) {
    throw new Error(
      `pnpm-workspace.yaml is missing the "${PACKAGES_START} … ${PACKAGES_END}" markers`
    );
  }

  const patchFiles: string[] = [];
  const withoutPackages = rootWorkspaceYaml.replace(re, '');
  const yaml = withoutPackages.replace(PATCHED_DEPENDENCIES_BLOCK, (_, entries: string) => {
    const kept = entries
      .split('\n')
      .filter((line) => {
        const match = PATCH_ENTRY.exec(line);
        if (!match || !isInstalled(match[1])) {
          return false;
        }
        patchFiles.push(match[2]);
        return true;
      })
      .map((line) => `${line}\n`)
      .join('');
    return kept ? `patchedDependencies:\n${kept}` : '';
  });

  return {
    yaml: `${yaml.replace(/^\n+/, '').replace(/\n*$/, '')}\n`,
    patchFiles,
  };
}
