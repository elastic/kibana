/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import globby from 'globby';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import { IGNORE_PATTERNS } from './precommit_hook/casing_check_config';
import { runFileCasingCheck } from './precommit_hook';

run(
  async ({ log, flagsReader }) => {
    const generateExceptions = flagsReader.boolean('generate-exceptions');

    const paths = await globby('**/*', {
      cwd: REPO_ROOT,
      onlyFiles: true,
      gitignore: true,
      ignore: IGNORE_PATTERNS,
    });

    await runFileCasingCheck(log, paths, { generateExceptions });
  },
  {
    flags: {
      boolean: ['generate-exceptions'],
      help: `
        --generate-exceptions  Collect current violations and append them to exceptions.json, then exit successfully.
      `,
    },
  }
);
