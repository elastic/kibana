/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '@kbn/utils';
import { discoverBazelPackages } from '@kbn/bazel-packages';

import { TEMPLATE_DIR } from '../paths';
import { GenerateCommand } from '../generate_command';

const USAGE = `node scripts/generate packages_build_manifest`;

export const PackagesBuildManifestCommand: GenerateCommand = {
  name: 'packages_build_manifest',
  usage: USAGE,
  description: 'Generate the packages/BUILD.bazel file',
  async run({ log, render }) {
    const packages = await discoverBazelPackages(REPO_ROOT);
    const dest = Path.resolve(REPO_ROOT, 'packages/BUILD.bazel');
    const relDest = Path.relative(process.cwd(), dest);

    const content = await render.toString(
      Path.join(TEMPLATE_DIR, 'packages_BUILD.bazel.ejs'),
      dest,
      { packages }
    );

    let existing;
    try {
      existing = await Fsp.readFile(dest, 'utf8');
    } catch {
      // noop
    }

    if (existing === content) {
      log.success(relDest, 'is already updated');
      return;
    }

    await Fsp.writeFile(dest, content);
    log.info(relDest, 'updated');
  },
};
