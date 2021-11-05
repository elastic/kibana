/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import datemath from '@elastic/datemath';
import yargs from 'yargs/yargs';
import { cleanWriteTargets } from '../lib/utils/clean_write_targets';
import { intervalToMs } from './utils/interval_to_ms';
import { getCommonResources } from './utils/get_common_resources';
import { startHistoricalDataUpload } from './utils/start_historical_data_upload';
import { startLiveDataUpload } from './utils/start_live_data_upload';

yargs(process.argv.slice(2))
  .command(
    '*',
    'Generate data and index into Elasticsearch',
    (y) => {
      return y
        .positional('file', {
          describe: 'File that contains the trace scenario',
          demandOption: true,
          string: true,
        })
        .option('target', {
          describe: 'Elasticsearch target, including username/password',
          demandOption: true,
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
        .conflicts('to', 'live');
    },
    async (argv) => {
      const file = String(argv.file || argv._[0]);

      const { target, workers, clean, clientWorkers, batchSize } = argv;

      const { scenario, intervalInMs, bucketSizeInMs, logger, writeTargets, client, logLevel } =
        await getCommonResources({
          ...argv,
          file,
        });

      if (clean) {
        await cleanWriteTargets({ writeTargets, client, logger });
      }

      const to = datemath.parse(String(argv.to ?? 'now'))!.valueOf();
      const from = argv.from
        ? datemath.parse(String(argv.from))!.valueOf()
        : to - intervalToMs('15m');

      const live = argv.live;

      logger.info(
        `Starting data generation\n: ${JSON.stringify(
          {
            intervalInMs,
            bucketSizeInMs,
            workers,
            target,
            writeTargets,
            from: new Date(from).toISOString(),
            to: new Date(to).toISOString(),
            live,
          },
          null,
          2
        )}`
      );

      startHistoricalDataUpload({
        from,
        to,
        file,
        bucketSizeInMs,
        client,
        workers,
        clientWorkers,
        batchSize,
        writeTargets,
        logger,
        logLevel,
        target,
      });

      if (live) {
        startLiveDataUpload({
          bucketSizeInMs,
          client,
          intervalInMs,
          logger,
          scenario,
          start: to,
          clientWorkers,
          batchSize,
          writeTargets,
        });
      }
    }
  )
  .parse();
