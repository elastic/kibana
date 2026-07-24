/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Task } from '../lib';
import { exec } from '../lib';

export const InstallDependencies: Task = {
  description: 'Installing node_modules, including production builds of packages',

  async run(_config, log, build) {
    // The repo pnpm-lock.yaml is copied into the build (see CopyLegacySource) to
    // seed resolution. The regenerated package.json changes the `.` importer
    // (file: deps + pruned list), so this can't be a frozen install — hence
    // `--no-frozen-lockfile` (CI defaults to frozen, which would abort on the
    // importer mismatch). pnpm reconciles the changed importer while reusing the
    // lockfile's existing resolutions for unchanged third-party ranges, so
    // transitive caret deps stay pinned to the repo's versions instead of drifting.
    // The build dir carries its own settings-only pnpm-workspace.yaml (see
    // CreatePackageJson); pnpm treats it as the workspace root, so it does NOT walk
    // up to the repo root AND it applies our hoisted linker + overrides (both of
    // which `--ignore-workspace` would suppress under pnpm 11).
    await exec(
      log,
      'pnpm',
      [
        'install',
        '--prod',
        // NOTE: do NOT pass --no-optional. pnpm omits optional deps (e.g.
        // @pkgjs/parseargs) from the lockfile under that flag, then the install's
        // own integrity check rejects the lockfile as missing those entries.
        '--no-frozen-lockfile',
        '--config.confirmModulesPurge=false',
        '--prefer-offline',
      ],
      {
        cwd: build.resolvePath(),
      }
    );
  },
};
