/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { run, createFlagError } from '@kbn/dev-utils';
import { runStorybookCli } from '@kbn/storybook';
import { storybookAliases } from './aliases';
import { clean } from './commands/clean';

run(
  async (params) => {
    const { flags, log } = params;
    const {
      _: [alias],
    } = flags;

    if (flags.verbose) {
      log.verbose('Flags:', flags);
    }

    if (flags.clean) {
      await clean({ log });
      return;
    }

    if (!alias) {
      throw createFlagError('Missing alias');
    }

    if (!storybookAliases.hasOwnProperty(alias)) {
      throw createFlagError(`Unknown alias [${alias}]`);
    }

    const configDir = (storybookAliases as any)[alias];

    log.verbose('Loading Storybook:', configDir);

    runStorybookCli({ configDir, name: alias });
  },
  {
    usage: `node scripts/storybook <alias>`,
    description: `
      Start a 📕 Storybook for a plugin

      Available aliases:
        ${Object.keys(storybookAliases)
          .map((alias) => `📕 ${alias}`)
          .join('\n        ')}

      Add your alias in src/dev/storybook/aliases.ts
    `,
    flags: {
      default: {},
      string: [],
      boolean: ['clean', 'site'],
      help: `
      --clean            Clean Storybook build folder.
      --site             Build static version of Storybook.
    `,
    },
  }
);
