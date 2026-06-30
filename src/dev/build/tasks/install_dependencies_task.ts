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

  async run(config, log, build) {
    // The in-build package.json is regenerated with `file:` deps pointing at the
    // copied-in package dirs, so it no longer matches the repo lockfile; install
    // resolves fresh (deps are exact-pinned + pnpm.overrides, so it's deterministic).
    // `--ignore-workspace` is required because the build dir lives under the repo,
    // and pnpm would otherwise walk up to the repo's pnpm-workspace.yaml and try a
    // frozen install against the (now-mismatched) repo lockfile.
    await exec(
      log,
      'pnpm',
      [
        'install',
        '--prod',
        // NOTE: do NOT pass --no-optional. pnpm omits optional deps (e.g.
        // @pkgjs/parseargs) from the lockfile under that flag, then the install's
        // own integrity check rejects the lockfile as missing those entries.
        '--ignore-workspace',
        '--config.confirmModulesPurge=false',
        '--prefer-offline',
      ],
      {
        cwd: build.resolvePath(),
      }
    );
  },
};
