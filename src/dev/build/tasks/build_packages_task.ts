/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import type { StdioOption } from 'execa';
import execa from 'execa';

import type { Task } from '../lib';
import { copyPackages } from '../lib/pkg_copier';

export const BuildPackages: Task = {
  description: 'Building distributable versions of packages',
  async run(config, log, build) {
    const packages = config.getDistPackagesFromRepo();

    log.info(`Building webpack artifacts which are necessary for the build`);
    await buildWebpackBundles({
      quiet: false,
      dist: true,
      noCache: true,
    });

    await copyPackages({ packages, config, build, log });
  },
};

export async function buildWebpackBundles({
  quiet,
  dist,
  noCache,
}: {
  quiet: boolean;
  dist: boolean;
  noCache?: boolean;
}) {
  const options = [
    quiet ? ['--quiet'] : [],
    dist ? ['--dist'] : [],
    noCache ? ['--no-cache'] : [],
  ].flat();
  const stdio: StdioOption[] = quiet
    ? ['ignore', 'pipe', 'pipe']
    : ['inherit', 'inherit', 'inherit'];

  await execa('yarn', ['kbn', 'build-shared', ...options], { cwd: REPO_ROOT, stdio });
}
