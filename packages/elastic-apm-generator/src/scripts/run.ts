/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import datemath from '@elastic/datemath';
import moment from 'moment';
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
    'live',
    'Continuously generate and index data into Elasticsearch',
    (y) => {
      return y
        .positional('file', fileOption)
        .option('bucketSize', bucketSizeOption)
        .option('workers', workerOption)
        .option('interval', intervalOption)
        .option('clean', cleanOption)
        .option('target', targetOption)
        .option('logLevel', logLevelOption)
        .option('lookback', {
          description: 'The lookback window for which data should be generated',
          default: '15m',
        });
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

      const lookback = intervalToMs(argv.lookback);

      if (clean) {
        await cleanWriteTargets({ writeTargets, client });
      }

      logger.info(
        `Starting live data generation: ${JSON.stringify({
          intervalInMs,
          lookback,
          bucketSizeInMs,
          workers,
          target,
          writeTargets,
        })}`
      );

      const now = moment(new Date().getTime()).startOf('minute').valueOf();
      const from = now - lookback.valueOf();
      const to = now;

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
  )
  .command(
    'fixed',
    'Upload data from a scenario for a fixed time range',
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
          default: 'now',
        });
    },
    async (argv) => {
      const to = datemath.parse(argv.to)!.valueOf();
      const from = argv.from
        ? datemath.parse(String(argv.from))!.valueOf()
        : to - intervalToMs('15m');

      const {
        scenario,
        intervalInMs,
        bucketSizeInMs,
        target,
        workers,
        clean,
        logger,
        client,
        writeTargets,
      } = await getCommonResources(argv);

      if (clean) {
        await cleanWriteTargets({ writeTargets, client });
      }

      logger.info(
        `Starting historical data generation: ${JSON.stringify({
          from: new Date(from).toISOString(),
          to: new Date(to).toISOString(),
          intervalInMs,
          bucketSizeInMs,
          workers,
          target,
          writeTargets,
        })}`
      );

      startHistoricalDataUpload({
        from,
        to,
        bucketSizeInMs,
        client,
        intervalInMs,
        workers,
        writeTargets,
        scenario,
        logger,
      });
    }
  )
  .parse();
