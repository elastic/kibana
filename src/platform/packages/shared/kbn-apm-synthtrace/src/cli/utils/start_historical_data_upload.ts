/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once, range } from 'lodash';
import moment from 'moment';
import { cpus } from 'os';
import Path from 'path';
import { Worker } from 'worker_threads';
import { LogLevel } from '../../..';
import { bootstrap } from './bootstrap';
import { RunOptions } from './parse_run_cli_flags';
import { WorkerData } from './synthtrace_worker';
import { getScenario } from './get_scenario';
import { StreamManager } from './stream_manager';
import { indexHistoricalData } from './index_historical_data';

export async function startHistoricalDataUpload({
  runOptions,
  from,
  to,
}: {
  runOptions: RunOptions;
  from: Date;
  to: Date;
}) {
  const { logger, clients } = await bootstrap(runOptions);

  const file = runOptions.file;

  const scenario = await logger.perf('get_scenario', async () => {
    const fn = await getScenario({ file, logger });
    return fn({
      ...runOptions,
      logger,
      from,
      to,
    });
  });

  const teardown = once(async () => {
    if (scenario.teardown) {
      await scenario.teardown(clients);
    }
  });

  const streamManager = new StreamManager(logger, teardown);

  streamManager.init();

  if (scenario.bootstrap) {
    await scenario.bootstrap(clients);
  }

  const cores = cpus().length;

  let workers = Math.min(runOptions.workers ?? 10, cores - 1);

  const rangeEnd = to;

  const diff = moment(from).diff(rangeEnd);

  const d = moment.duration(Math.abs(diff), 'ms');

  // make sure ranges cover at least 1m
  const minIntervalSpan = moment.duration(1, 'm');

  const minNumberOfRanges = d.asMilliseconds() / minIntervalSpan.asMilliseconds();
  if (minNumberOfRanges < workers) {
    workers = Math.max(1, Math.floor(minNumberOfRanges));
    if (runOptions.workers) {
      logger.info(
        `Ignoring --workers ${runOptions.workers} since each worker would not see enough data`
      );
    }
    logger.info(`updating maxWorkers to ${workers} to ensure each worker does enough work`);
  }

  logger.info(`Generating data from ${from.toISOString()} to ${rangeEnd.toISOString()}`);

  function rangeStep(interval: number) {
    if (from > rangeEnd) return moment(from).subtract(interval, 'ms').toDate();
    return moment(from).add(interval, 'ms').toDate();
  }

  // precalculate intervals to spawn workers over.
  // abs() the difference to make add/subtract explicit in rangeStep() in favor of subtracting a negative number
  const intervalSpan = Math.abs(diff / workers);
  const intervals = range(0, workers)
    .map((i) => intervalSpan * i)
    .map((interval, index) => ({
      workerIndex: index,
      bucketFrom: rangeStep(interval),
      bucketTo: rangeStep(interval + intervalSpan),
    }));

  function runService({
    bucketFrom,
    bucketTo,
    workerIndex,
  }: {
    bucketFrom: Date;
    bucketTo: Date;
    workerIndex: number;
  }) {
    return new Promise((resolve, reject) => {
      logger.debug(`Setting up Worker: ${workerIndex}`);
      const workerData: WorkerData = {
        runOptions,
        bucketFrom,
        bucketTo,
        workerId: workerIndex.toString(),
        from,
        to,
      };
      const worker = new Worker(Path.join(__dirname, './worker.js'), {
        workerData,
      });
      worker.on('message', ([logLevel, msg]: [string, string]) => {
        switch (logLevel) {
          case LogLevel.debug:
            logger.debug(msg);
            return;
          case LogLevel.info:
            logger.info(msg);
            return;
          case LogLevel.verbose:
            logger.verbose(msg);
            return;
          case LogLevel.warn:
            logger.warning(msg);
            return;
          case LogLevel.error:
            logger.error(msg);
            return;
          default:
            logger.info(msg);
        }
      });
      worker.on('error', (message) => {
        logger.error(message);
        reject();
      });
      worker.on('exit', (code) => {
        if (code === 2) reject(new Error(`Worker ${workerIndex} exited with error: ${code}`));
        if (code === 1) {
          logger.info(`Worker ${workerIndex} exited early because cancellation was requested`);
        }
        resolve(null);
      });
      worker.postMessage('start');
    });
  }

  const workerServices =
    intervals.length === 1
      ? // just run in this process. it's hard to attach
        // a debugger to a worker_thread, see:
        // https://issues.chromium.org/issues/41461728
        [
          indexHistoricalData({
            bucketFrom: intervals[0].bucketFrom,
            bucketTo: intervals[0].bucketTo,
            clients,
            logger,
            runOptions,
            workerId: 'i',
            from,
            to,
          }),
        ]
      : range(0, intervals.length).map((index) => runService(intervals[index]));

  await Promise.all(workerServices);

  await teardown();
}
