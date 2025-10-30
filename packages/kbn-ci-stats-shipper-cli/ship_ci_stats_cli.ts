/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';

import { CiStatsReporter, CiStatsMetric } from '@kbn/ci-stats-reporter';

import { createFailError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';

run(
  async ({ log, flagsReader }) => {
    const validate = flagsReader.boolean('validate');
    const metricPaths = flagsReader.arrayOfStrings('metrics') ?? [];

    const maybeFail = (message: string) => {
      const error = createFailError(message);
      if (process.env.IGNORE_SHIP_CI_STATS_ERROR === 'true') {
        error.exitCode = 0;
      }
      return error;
    };

    const reporter = CiStatsReporter.fromEnv(log);

    if (!reporter.isEnabled()) {
      throw maybeFail('unable to initialize the CI Stats reporter');
    }

    const overLimit: string[] = [];

    for (const path of metricPaths) {
      // resolve path from CLI relative to CWD
      const abs = Path.resolve(path);
      const json = Fs.readFileSync(abs, 'utf8');
      const metrics: CiStatsMetric[] = JSON.parse(json);
      if (await reporter.metrics(metrics)) {
        log.success('shipped metrics from', path);
      } else {
        throw maybeFail('failed to ship metrics');
      }

      for (const metric of metrics) {
        if (metric.limit !== undefined && metric.limit < metric.value) {
          overLimit.push(
            `${metric.group} for ${metric.id} plugin is greater than the limit of ${metric.limit}. The current value is ${metric.value}.`,
            'To update the limit, run the following command locally:',
            `node scripts/build_kibana_platform_plugins --focus ${metric.id} --update-limits`
          );
        }
      }
    }

    if (validate && overLimit.length) {
      throw maybeFail(`Metric overages:\n${overLimit.map((l) => `  ${l}`).join('\n')}`);
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
      boolean: ['validate'],
      help: `
        --metrics [path]   A path to a JSON file that includes metrics which should be sent. Multiple instances supported
        --validate         When passed, the process will exit with an error message and a non-zero exit status if any of the bundle limits are exceeded.
      `,
    },
  }
);
