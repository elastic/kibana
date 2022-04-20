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
import { validateFile } from '../lib/validate_file';

const USAGE = `node scripts/generate packages_build_manifest`;

export const PackagesBuildManifestCommand: GenerateCommand = {
  name: 'packages_build_manifest',
  usage: USAGE,
  description: 'Generate the packages/BUILD.bazel file',
  flags: {
    boolean: ['validate'],
    help: `
      --validate         Rather than writing the generated output to disk, validate that the content on disk is in sync with the
    `,
  },
  async run({ log, render, flags }) {
    const validate = !!flags.validate;

    const packages = await discoverBazelPackages();
    const dest = Path.resolve(REPO_ROOT, 'packages/BUILD.bazel');
    const relDest = Path.relative(process.cwd(), dest);

    const content = await render.toString(
      Path.join(TEMPLATE_DIR, 'packages_BUILD.bazel.ejs'),
      dest,
      {
        packages,
      }
    );

    if (validate) {
      await validateFile(log, USAGE, dest, content);
      return;
    }

    await Fsp.writeFile(dest, content);
    log.success('Wrote', relDest);
  },
};
