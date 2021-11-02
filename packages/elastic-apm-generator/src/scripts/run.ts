/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import datemath from '@elastic/datemath';
import yargs from 'yargs/yargs';
import { cleanWriteTargets } from './utils/clean_write_targets';
import {
  bucketSizeOption,
  cleanOption,
  fileOption,
  intervalOption,
  targetOption,
  workerOption,
  logLevelOption,
} from './utils/common_options';
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
        .positional('file', fileOption)
        .option('bucketSize', bucketSizeOption)
        .option('workers', workerOption)
        .option('interval', intervalOption)
        .option('clean', cleanOption)
        .option('target', targetOption)
        .option('logLevel', logLevelOption)
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
        .conflicts('to', 'live');
    },
    async (argv) => {
      const {
        scenario,
        intervalInMs,
        bucketSizeInMs,
        target,
        workers,
        clean,
        logger,
        writeTargets,
        client,
      } = await getCommonResources(argv);

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
        scenario,
        intervalInMs,
        bucketSizeInMs,
        client,
        workers,
        writeTargets,
        logger,
      });

      if (live) {
        startLiveDataUpload({
          bucketSizeInMs,
          client,
          intervalInMs,
          logger,
          scenario,
          start: to,
          workers,
          writeTargets,
        });
      }
    }
  )
  .parse();
