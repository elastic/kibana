/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import datemath from '@kbn/datemath';
import { Argv } from 'yargs';
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
    .usage('$0 <file>')
    .positional('file', {
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
    .option('logLevel', {
      describe: 'Log level',
      choices: ['trace', 'debug', 'info', 'error'],
      default: 'info',
    })
    .option('scenarioOpts', {
      describe: 'Options specific to the scenario',
      coerce: (arg) => {
        return arg as Record<string, any> | undefined;
      },
    })
    .option('assume-package-version', {
      describe: 'Assumes passed package version to avoid calling Fleet API to install',
      string: true,
    })
    .example(
      '$0 simple_logs --target=http://admin:changeme@localhost:9200',
      'Ingest data to specific Elasticsearch cluster'
    )
    .example('$0 simple_logs --live', 'Continuously ingest data to local development cluster')
    .example('$0 simple_logs --from=now-24h --to=now', 'Ingest data for a fixed time window')
    .showHelpOnFail(false)
    .wrap(null);
}

async function run(argv: RunCliFlags) {
  const runOptions = parseRunCliFlags(argv);

  const toMs = datemath.parse(String(argv.to ?? 'now'))!.valueOf();
  const to = new Date(toMs);

  const defaultTimeRange = '1m';

  const fromMs = argv.from
    ? datemath.parse(String(argv.from))!.valueOf()
    : toMs - intervalToMs(defaultTimeRange);
  const from = new Date(fromMs);

  const live = argv.live;

  if (live) {
    await startLiveDataUpload({ runOptions, start: from });
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
