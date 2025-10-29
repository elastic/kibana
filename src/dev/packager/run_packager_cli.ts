/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { clean } from './commands/clean';

run(
  async (params) => {
    const { flags, log } = params;
    const {
      _: [packageName],
    } = flags;

    if (flags.verbose) {
      log.verbose('Flags:', flags);
    }

    if (flags.clean) {
      await clean({ log });
      return;
    }
  },
  {
    usage: `node scripts/packager <alias>`,
    description: `
      Build a package.
    `,
    flags: {
      default: {},
      string: [],
      boolean: ['clean'],
      help: `
      --clean            Clean Packager build folder.
    `,
    },
  }
);
