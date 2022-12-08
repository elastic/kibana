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
import { intervalToMs } from './utils/interval_to_ms';
import { parseRunCliFlags } from './utils/parse_run_cli_flags';
import { startHistoricalDataUpload } from './utils/start_historical_data_upload';
import { startLiveDataUpload } from './utils/start_live_data_upload';

function options(y: Argv) {
  return y
    .positional('file', {
      describe: 'File that contains the trace scenario',
      demandOption: true,
      string: true,
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
    .option('versionOverride', {
      describe: 'Package/observer version override',
      string: true,
    })
    .option('logLevel', {
      describe: 'Log level',
      default: 'info',
    })
    .option('scenarioOpts', {
      describe: 'Options specific to the scenario',
      coerce: (arg) => {
        return arg as Record<string, any> | undefined;
      },
    })
    .showHelpOnFail(false);
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
