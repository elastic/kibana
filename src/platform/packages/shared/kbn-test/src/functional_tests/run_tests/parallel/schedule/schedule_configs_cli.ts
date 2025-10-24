/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';

import { SCHEDULE_FLAG_OPTIONS, parseFlags } from './flags';
import { scheduleConfigs } from './schedule_configs';

export function runTestsScheduleCli() {
  return run(
    async ({ flagsReader, log }) => {
      const { configs, maxDurationMins, machines } = parseFlags(flagsReader);

      const scheduleResult = await scheduleConfigs({
        configs,
        maxDurationMins,
        machines,
      });

      process.stdout.write(`${JSON.stringify(scheduleResult, null, 2)}\n`);
    },
    {
      description: `Schedule Functional Tests`,
      usage: `
      Usage:
        node scripts/functional_tests_schedule --help
        node scripts/functional_tests_schedule --configs=(json)
      `,
      flags: SCHEDULE_FLAG_OPTIONS,
    }
  );
}
