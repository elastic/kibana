/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import datemath from '@kbn/datemath';
import type { Argv } from 'yargs';
import yargs from 'yargs/yargs';
import { readdirSync } from 'fs';
import path from 'path';
import { intervalToMs } from './utils/interval_to_ms';
import { parseRunCliFlags } from './utils/parse_run_cli_flags';
import { startHistoricalDataUpload } from './utils/start_historical_data_upload';
import { startLiveDataUpload } from './utils/start_live_data_upload';

function getBuiltinScenarios() {
  return readdirSync(path.resolve(__dirname, '../scenarios')).map((s) => s.replace(/\.ts$/, ''));
}

function options(y: Argv) {
  return y
    .usage('$0 <files ...>')
    .positional('files', {
      describe: 'Name of scenario',
      demandOption: true,
      string: true,
      choices: getBuiltinScenarios(),
    })
    .option('target', {
      describe: 'Elasticsearch target',
      string: true,
    })
    .option('kibana', {
      describe: 'Kibana target, used to bootstrap datastreams/mappings/templates/settings',
      string: true,
    })
    .option('apiKey', {
      describe: 'Kibana API key',
      string: true,
    })
    .option('from', {
      description: 'The start of the time window',
    })
    .option('to', {
      description: 'The end of the time window',
    })
    .option('live', {
      description: 'Generate and index data continuously',
      boolean: true,
    })
    .option('uniqueIds', {
      description: 'Generate unique ids to avoid id collisions',
      boolean: true,
    })
    .option('liveBucketSize', {
      description: 'Bucket size in ms for live streaming',
      default: 1000,
      number: true,
    })
    .option('clean', {
      describe: 'Clean APM indices before indexing new data',
      default: false,
      boolean: true,
    })
    .option('workers', {
      describe: 'Amount of Node.js worker threads',
      number: true,
    })
    .option('concurrency', {
      describe: 'Concurrency of Elasticsearch client bulk indexing',
      number: true,
      default: 1,
    })
    .option('debug', {
      describe: 'Use a debug log level',
      boolean: true,
    })
    .option('verbose', {
      describe: 'Use a verbose log level',
      boolean: true,
    })
    .option('logLevel', {
      describe: 'Log level',
      choices: ['verbose', 'debug', 'info', 'error'],
      default: 'info',
    })
    .option('scenarioOpts', {
      describe: 'Options specific to the scenario',
      type: 'string',
      coerce: (arg: string): Record<string, unknown> => {
        if (!arg) {
          return {};
        }

        let scenarioOptions: Record<string, unknown> = {};

        try {
          scenarioOptions = typeof arg === 'string' ? JSON.parse(arg) : arg;
        } catch (error) {
          scenarioOptions = Object.fromEntries(
            arg.split(',').map((kv) => {
              const [key, value] = kv
                .trim()
                .split('=')
                .map((part) => part.trim());
              if (value === 'true') {
                return [key, true];
              }
              if (value === 'false') {
                return [key, false];
              }

              if (!isNaN(Number(value))) {
                return [key, Number(value)];
              }

              return [key, value];
            })
          );
        }

        return scenarioOptions;
      },
    })
    .option('assume-package-version', {
      describe: 'Assumes passed package version to avoid calling Fleet API to install',
      string: true,
    })
    .option('insecure', {
      describe: 'Skip SSL certificate validation (useful for self-signed certificates)',
      boolean: true,
      default: false,
    })
    .example(
      '$0 simple_logs --target=http://admin:changeme@localhost:9200',
      'Ingest data to specific Elasticsearch cluster'
    )
    .example('$0 simple_logs --live', 'Continuously ingest data to local development cluster')
    .example('$0 simple_logs --from=now-24h --to=now', 'Ingest data for a fixed time window')
    .example(
      '$0 simple_logs --target=https://elastic:changeme@localhost:9200 --insecure',
      'Connect to HTTPS Elasticsearch with self-signed certificates'
    )
    .showHelpOnFail(false)
    .wrap(null);
}

async function run(argv: RunCliFlags) {
  const runOptions = parseRunCliFlags(argv);

  const to = datemath.parse(String(argv.to ?? 'now'))!.valueOf();

  const defaultTimeRange = '1m';

  const from = argv.from
    ? datemath.parse(String(argv.from))!.valueOf()
    : to - intervalToMs(defaultTimeRange);

  const live = argv.live;

  if (live) {
    await startLiveDataUpload({ runOptions, from, to });
  } else {
    await startHistoricalDataUpload({ runOptions, from, to });
  }
}

export type RunCliFlags = ReturnType<typeof options>['argv'];

export function runSynthtrace() {
  yargs(process.argv.slice(2))
    .command('*', 'Generate data and index into Elasticsearch', options, (argv: RunCliFlags) => {
      run(argv).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
      });
    })
    .parse();
}
