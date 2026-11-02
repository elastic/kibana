/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command } from '@kbn/dev-cli-runner';
import { runDoctor } from './run_doctor';

/**
 * Check that the local setup can run Scout tests
 */
export const doctorCmd: Command<void> = {
  name: 'doctor',
  description: 'Check that your local setup is ready to run Scout tests',
  flags: {
    string: ['arch'],
    help: `
    --arch              Server architecture to check (one of: stateful, serverless) [default: both]
    `,
  },
  run: async ({ flagsReader, log }) => {
    const arch = flagsReader.enum('arch', ['stateful', 'serverless']);
    if (!(await runDoctor(log, arch))) {
      process.exitCode = 1;
    }
  },
};
