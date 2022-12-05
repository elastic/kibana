/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { range } from 'lodash';
import moment from 'moment';
import { cpus } from 'os';
import pLimit from 'p-limit';
import Path from 'path';
import { Worker } from 'worker_threads';
import { ApmSynthtraceEsClient, LogLevel } from '../../..';
import { Logger } from '../../lib/utils/create_logger';
import { RunOptions } from './parse_run_cli_flags';

export async function startHistoricalDataUpload(
  esClient: ApmSynthtraceEsClient,
  logger: Logger,
  runOptions: RunOptions,
  from: Date,
  to: Date,
  version: string
) {
  const cores = cpus().length;
  // settle on a reasonable max concurrency arbitrarily capping at 10.
  let maxConcurrency = Math.min(10, cores - 1);
  // maxWorkers to be spawned is double that of maxConcurrency. We estimate the number of ranges over
  // maxConcurrency, if that is too conservative this provides more available workers to complete the job.
  // If any worker finds that work is already completed they will spin down immediately.
  let maxWorkers = maxConcurrency * 2;
  logger.info(
    `Discovered ${cores} cores, splitting work over ${maxWorkers} workers with limited concurrency: ${maxConcurrency}`
  );

  // if --workers N is specified it should take precedence over inferred maximum workers
  if (runOptions.workers) {
    // ensure maxWorkers is at least 1
    maxWorkers = Math.max(1, runOptions.workers);
    // ensure max concurrency is at least 1 or the ceil of --workers N / 2
    maxConcurrency = Math.ceil(Math.max(1, maxWorkers / 2));
    logger.info(
      `updating maxWorkers to ${maxWorkers} and maxConcurrency to ${maxConcurrency} because it was explicitly set through --workers`
    );
  }

  const rangeEnd = to;

  const diff = moment(from).diff(rangeEnd);
  const d = moment.duration(Math.abs(diff), 'ms');
  logger.info(
    `Range: ${d.years()} days ${d.days()} days, ${d.hours()} hours ${d.minutes()} minutes ${d.seconds()} seconds`
  );

  // make sure ranges cover at least 100k documents
  const minIntervalSpan = moment.duration(60, 'm');

  const minNumberOfRanges = d.asMilliseconds() / minIntervalSpan.asMilliseconds();
  if (minNumberOfRanges < maxWorkers) {
    maxWorkers = Math.max(1, Math.floor(minNumberOfRanges));
    maxConcurrency = Math.max(1, maxWorkers / 2);
    if (runOptions.workers) {
      logger.info(
        `Ignoring --workers ${runOptions.workers} since each worker would not see enough data`
      );
    }
    logger.info(
      `updating maxWorkers to ${maxWorkers} and maxConcurrency to ${maxConcurrency} to ensure each worker does enough work`
    );
  }

  logger.info(`Generating data from ${from.toISOString()} to ${rangeEnd.toISOString()}`);

  interface WorkerMessages {
    log: LogLevel;
    args: any[];
  }

  function rangeStep(interval: number) {
    if (from > rangeEnd) return moment(from).subtract(interval, 'ms').toDate();
    return moment(from).add(interval, 'ms').toDate();
  }

  // precalculate intervals to spawn workers over.
  // abs() the difference to make add/subtract explicit in rangeStep() in favor of subtracting a negative number
  const intervalSpan = Math.abs(diff / maxWorkers);
  const intervals = range(0, maxWorkers)
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
      logger.info(`Setting up Worker: ${workerIndex}`);
      const worker = new Worker(Path.join(__dirname, './worker.js'), {
        workerData: {
          runOptions,
          bucketFrom,
          bucketTo,
          workerIndex,
          version,
        },
      });
      worker.on('message', (message: WorkerMessages) => {
        switch (message.log) {
          case LogLevel.debug:
            logger.debug.apply({}, message.args);
            return;
          case LogLevel.info:
            logger.info.apply({}, message.args);
            return;
          case LogLevel.trace:
            logger.debug.apply({}, message.args);
            return;
          case LogLevel.error:
            logger.error.apply({}, message.args);
            return;
          default:
            logger.info(message);
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
      worker.postMessage('setup');
      worker.postMessage('start');
    });
  }

  const limiter = pLimit(Math.max(1, Math.floor(intervals.length / 2)));
  const workers = range(0, intervals.length).map((index) => () => runService(intervals[index]));
  return Promise.all(workers.map((worker) => limiter(() => worker()))).then(async () => {
    await esClient.refresh();
  });
}
