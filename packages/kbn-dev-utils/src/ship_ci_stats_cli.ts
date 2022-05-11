/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { CiStatsReporter } from '@kbn/ci-stats-reporter';

import { run, createFlagError, createFailError } from './run';

export function shipCiStatsCli() {
  run(
    async ({ log, flags }) => {
      let metricPaths = flags.metrics;
      if (typeof metricPaths === 'string') {
        metricPaths = [metricPaths];
      } else if (!Array.isArray(metricPaths) || !metricPaths.every((p) => typeof p === 'string')) {
        throw createFlagError('expected --metrics to be a string');
      }

      const maybeFail = (message: string) => {
        const error = createFailError(message);
        if (process.env.IGNORE_SHIP_CI_STATS_ERROR === 'true') {
          error.exitCode = 0;
        }
        return error;
      };

      const reporter = CiStatsReporter.fromEnv(log);

      if (!reporter.isEnabled()) {
        throw maybeFail('unable to initilize the CI Stats reporter');
      }

      for (const path of metricPaths) {
        // resolve path from CLI relative to CWD
        const abs = Path.resolve(path);
        const json = Fs.readFileSync(abs, 'utf8');
        if (await reporter.metrics(JSON.parse(json))) {
          log.success('shipped metrics from', path);
        } else {
          throw maybeFail('failed to ship metrics');
        }
      }
    },
    {
      description: 'ship ci-stats which have been written to files',
      usage: `node scripts/ship_ci_stats`,
      log: {
        defaultLevel: 'debug',
      },
      flags: {
        string: ['metrics'],
        help: `
          --metrics [path]   A path to a JSON file that includes metrics which should be sent. Multiple instances supported
        `,
      },
    }
  );
}
