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
import { ApmSynthtraceKibanaClient } from '../lib/apm/client/apm_synthtrace_kibana_client';
import { getCommonServices } from './utils/get_common_services';
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
    .option('local', {
      describe:
        'Shortcut during development, assumes `yarn es snapshot` and `yarn start` are running',
      boolean: true,
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
    .conflicts('local', 'target')
    .conflicts('local', 'kibana')
    .showHelpOnFail(false);
}

export type RunCliFlags = ReturnType<typeof options>['argv'];

export function runSynthtrace() {
  yargs(process.argv.slice(2))
    .command(
      '*',
      'Generate data and index into Elasticsearch',
      options,
      async (argv: RunCliFlags) => {
        if (argv.local) {
          argv.target = 'http://admin:changeme@localhost:9200';
        }

        const optionsWithTarget = {
          ...argv,
          target: argv.target || argv.local ? 'http://admin:changeme@localhost:9200' : '',
        };

        if (!optionsWithTarget.target) {
          throw new Error('Could not determine an Elasticsearch target');
        }

        const runOptions = parseRunCliFlags(optionsWithTarget);

        const { logger, apmEsClient } = getCommonServices(runOptions);

        const toMs = datemath.parse(String(argv.to ?? 'now'))!.valueOf();
        const to = new Date(toMs);

        const defaultTimeRange = '1m';

        const fromMs = argv.from
          ? datemath.parse(String(argv.from))!.valueOf()
          : toMs - intervalToMs(defaultTimeRange);
        const from = new Date(fromMs);

        const live = argv.live;

        // we need to know the running version to generate events that satisfy the min version requirements
        let version = await apmEsClient.runningVersion();
        logger.info(`Discovered Elasticsearch running version: ${version}`);
        version = version.replace('-SNAPSHOT', '');

        // We automatically set up managed APM either by migrating on cloud or installing the package locally
        if (argv.local || argv.kibana) {
          const kibanaClient = new ApmSynthtraceKibanaClient({ logger });
          let kibanaUrl: string | null = argv.kibana ?? null;

          if (argv.local) {
            kibanaUrl = await kibanaClient.discoverLocalKibana();
          }
          if (!kibanaUrl) throw Error('kibanaUrl could not be determined');

          version = await kibanaClient.fetchLatestApmPackageVersion(kibanaUrl);

          await kibanaClient.installApmPackage(kibanaUrl, version);
        }

        if (argv.clean) {
          await apmEsClient.clean();
        }

        logger.info(
          `Starting data generation\n: ${JSON.stringify(
            {
              ...runOptions,
              from: from.toISOString(),
              to: to.toISOString(),
            },
            null,
            2
          )}`
        );

        if (live) {
          await startLiveDataUpload({ esClient: apmEsClient, logger, runOptions, start: from });
        } else {
          await startHistoricalDataUpload(apmEsClient, logger, runOptions, from, to, version);
        }
      }
    )
    .parse();
}
