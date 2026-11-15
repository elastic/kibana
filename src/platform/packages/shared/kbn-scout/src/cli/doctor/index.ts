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
 * Check that the setup can run Scout tests on Elastic Cloud and locally
 */
export const doctorCmd: Command<void> = {
  name: 'doctor',
  description: 'Check that your setup is ready to run Scout tests on Elastic Cloud and locally',
  flags: {
    string: ['location', 'arch'],
    boolean: ['fix'],
    help: `
    --location          Only check where tests run (one of: cloud, local) [default: both]
    --arch              Only check one server architecture (one of: stateful, serverless) [default: both]
    --fix               Run the commands that fix failed checks and warnings, asking first for destructive ones
    `,
  },
  run: async ({ flagsReader, log }) => {
    const location = flagsReader.enum('location', ['cloud', 'local']);
    const arch = flagsReader.enum('arch', ['stateful', 'serverless']);
    if (!(await runDoctor(log, { location, arch, fix: flagsReader.boolean('fix') }))) {
      process.exitCode = 1;
    }
  },
};
