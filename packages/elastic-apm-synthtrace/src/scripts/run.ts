/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import datemath from '@elastic/datemath';
import yargs from 'yargs/yargs';
import { Argv } from 'yargs';
import { intervalToMs } from './utils/interval_to_ms';
import { startHistoricalDataUpload } from './utils/start_historical_data_upload';
import { startLiveDataUpload } from './utils/start_live_data_upload';
import { parseRunCliFlags } from './utils/parse_run_cli_flags';
import { getCommonServices } from './utils/get_common_services';
import { ApmSynthtraceKibanaClient } from '../lib/apm/client/apm_synthtrace_kibana_client';
import { ApmSynthtraceEsClient } from '../lib/apm/client/apm_synthtrace_es_client';

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
    .option('cloudId', {
      describe:
        'Provide connection information and will force APM on the cloud to migrate to run as a Fleet integration',
      string: true,
    })
    .option('username', {
      describe: 'Basic authentication username',
      string: true,
      demandOption: true,
    })
    .option('password', {
      describe: 'Basic authentication password',
      string: true,
      demandOption: true,
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
    .option('--dryRun', {
      description: 'Enumerates the stream without sending events to Elasticsearch ',
      boolean: true,
    })
    .option('maxDocs', {
      description:
        'The maximum number of documents we are allowed to generate, should be multiple of 10.000',
      number: true,
    })
    .option('numShards', {
      description:
        'Updates the component templates to update the number of primary shards, requires cloudId to be provided',
      number: true,
    })
    .option('clean', {
      describe: 'Clean APM indices before indexing new data',
      default: false,
      boolean: true,
    })
    .option('workers', {
      describe: 'Amount of Node.js worker threads',
      default: 5,
    })
    .option('bucketSize', {
      describe: 'Size of bucket for which to generate data',
      default: '15m',
    })
    .option('interval', {
      describe: 'The interval at which to index data',
      default: '10s',
    })
    .option('clientWorkers', {
      describe: 'Number of concurrently connected ES clients',
      default: 5,
    })
    .option('batchSize', {
      describe: 'Number of documents per bulk index request',
      default: 1000,
    })
    .option('logLevel', {
      describe: 'Log level',
      default: 'info',
    })
    .option('writeTarget', {
      describe: 'Target to index',
      string: true,
    })
    .option('scenarioOpts', {
      describe: 'Options specific to the scenario',
      coerce: (arg) => {
        return arg as Record<string, any> | undefined;
      },
    })
    .conflicts('to', 'live')
    .conflicts('maxDocs', 'live')
    .conflicts('target', 'cloudId');
}

export type RunCliFlags = ReturnType<typeof options>['argv'];

yargs(process.argv.slice(2))
  .command('*', 'Generate data and index into Elasticsearch', options, async (argv) => {
    const runOptions = parseRunCliFlags(argv);

    const { logger, client } = getCommonServices(runOptions);

    const toMs = datemath.parse(String(argv.to ?? 'now'))!.valueOf();
    const to = new Date(toMs);
    const defaultTimeRange = !runOptions.maxDocs ? '15m' : '52w';
    const fromMs = argv.from
      ? datemath.parse(String(argv.from))!.valueOf()
      : toMs - intervalToMs(defaultTimeRange);
    const from = new Date(fromMs);

    const live = argv.live;

    const forceDataStreams = !!runOptions.cloudId;
    const esClient = new ApmSynthtraceEsClient(client, logger, forceDataStreams);
    if (runOptions.dryRun) {
      await startHistoricalDataUpload(esClient, logger, runOptions, from, to);
      return;
    }
    if (runOptions.cloudId) {
      const kibanaClient = new ApmSynthtraceKibanaClient(logger);
      await kibanaClient.migrateCloudToManagedApm(
        runOptions.cloudId,
        runOptions.username,
        runOptions.password
      );
    }

    if (runOptions.cloudId && runOptions.numShards && runOptions.numShards > 0) {
      await esClient.updateComponentTemplates(runOptions.numShards);
    }

    if (argv.clean) {
      await esClient.clean();
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

    await startHistoricalDataUpload(esClient, logger, runOptions, from, to);

    if (live) {
      await startLiveDataUpload(esClient, logger, runOptions, to);
    }
  })
  .parse();
