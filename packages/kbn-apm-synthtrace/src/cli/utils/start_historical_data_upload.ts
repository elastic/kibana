/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { range } from 'lodash';
import moment from 'moment';
import { cpus } from 'os';
import Path from 'path';
import { Worker } from 'worker_threads';
import { LogLevel } from '../../..';
import { bootstrap } from './bootstrap';
import { RunOptions } from './parse_run_cli_flags';
import { WorkerData } from './synthtrace_worker';

export async function startHistoricalDataUpload({
  runOptions,
  from,
  to,
}: {
  runOptions: RunOptions;
  from: Date;
  to: Date;
}) {
  const { logger, esUrl, version } = await bootstrap(runOptions);

  const cores = cpus().length;

  let workers = Math.min(runOptions.workers ?? 10, cores - 1);

  const rangeEnd = to;

  const diff = moment(from).diff(rangeEnd);

  const d = moment.duration(Math.abs(diff), 'ms');

  // make sure ranges cover at least 100k documents
  const minIntervalSpan = moment.duration(60, 'm');

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
        esUrl,
        version,
      };
      const worker = new Worker(Path.join(__dirname, './worker.js'), {
        workerData,
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
      worker.postMessage('start');
    });
  }

  const workerServices = range(0, intervals.length).map((index) => runService(intervals[index]));

  return Promise.all(workerServices);
}
