/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command } from '@kbn/dev-cli-runner';
import { runPick } from './run_pick';

/**
 * Pick Scout tests to run in an interactive terminal
 */
export const pickCmd: Command<void> = {
  name: 'pick',
  description:
    'Pick Scout tests to run: pinned configs, specs changed on your branch, or search for a config',
  run: async ({ log }) => {
    await runPick(log);
  },
};
