/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// import pLimit from 'p-limit';
import moment from 'moment';
import { Worker } from 'worker_threads';
import Path from 'path';
import { range } from 'lodash';
import pLimit from 'p-limit';
import * as os from 'os';
import { RunOptions } from './parse_run_cli_flags';
import { getScenario } from './get_scenario';
import { getLogger } from './get_common_services';
import { LogLevel } from '../..';

export async function startHistoricalDataUpload(runOptions: RunOptions, from: Date, to: Date) {
  const logger = getLogger(runOptions);
  // if we want to generate a maximum number of documents reverse generation to descend.
  [from, to] = runOptions.maxDocs ? [to, from] : [from, to];

  const file = runOptions.file;
  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));
  const { generate } = await scenario(runOptions);

  const cores = os.cpus().length;
  let maxConcurrency = Math.min(10, cores - 1);
  let maxWorkers = maxConcurrency * 2;
  logger.info(
    `Discovered ${cores} cores, splitting work over ${maxWorkers} workers with limited concurrency: ${maxConcurrency}`
  );

  const events = logger.perf('generate_scenario', () => generate({ from, to }));
  const ratePerMinute = events.ratePerMinute();
  logger.info(
    `Scenario is generating ${ratePerMinute.toLocaleString()} events per minute interval`
  );
  let to2 = to;
  let intervals = [{ bucketFrom: from, bucketTo: to, workerIndex: 0 }];
  if (runOptions.maxDocs) {
    to2 = moment(from)
      // ratePerMinute() is not exact if the generator is yielding variable documents
      // the rate is calculated by peeking the first yielded event and its children.
      // for real complex cases manually specifying --to is encouraged.
      .subtract((runOptions.maxDocs / ratePerMinute) * runOptions.maxDocsConfidence, 'm')
      .toDate();
    const diff = moment(from).diff(to2);
    const d = moment.duration(diff, 'ms');
    logger.info(
      `Estimated interval length ${d.days()} days, ${d.hours()} hours ${d.minutes()} minutes ${d.seconds()} seconds`
    );
    // make sure ranges cover atleast 100k documents
    const minIntervalSpan = moment.duration(100000 / ratePerMinute, 'm');
    const minNumberOfRanges = d.asMilliseconds() / minIntervalSpan.asMilliseconds();
    if (minNumberOfRanges < maxWorkers) {
      maxWorkers = Math.floor(minNumberOfRanges);
      maxConcurrency = Math.max(1, maxWorkers / 2);
      logger.info(
        `updating maxWorkers to ${maxWorkers} and maxConcurrency to ${maxConcurrency} to ensure each worker does enough work`
      );
    }

    const intervalSpan = diff / maxWorkers;
    intervals = range(0, maxWorkers)
      .map((i) => intervalSpan * i)
      .map((interval, index) => ({
        workerIndex: index,
        bucketFrom: moment(from).subtract(interval, 'ms').toDate(),
        bucketTo: moment(from)
          .subtract(interval + intervalSpan, 'ms')
          .toDate(),
      }));
  }

  logger.info(`Generating data from ${from.toISOString()} to ${to2.toISOString()}`);

  type WorkerMessages =
    | { log: LogLevel; args: any[] }
    | { workerIndex: number; processedDocuments: number }
    | { workerIndex: number; firstTimestamp: Date }
    | { workerIndex: number; lastTimestamp: Date };

  interface WorkerTotals {
    total: number;
    bucketFrom: Date;
    bucketTo: Date;
    firstTimestamp?: Date;
    lastTimestamp?: Date;
  }

  let totalProcessed = 0;
  const workerProcessed = range(0, maxWorkers).reduce<Record<number, WorkerTotals>>((p, c, i) => {
    p[i] = { total: 0, bucketFrom: intervals[i].bucketFrom, bucketTo: intervals[i].bucketTo };
    return p;
  }, {});

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
      if (runOptions.maxDocs && totalProcessed >= runOptions.maxDocs + 10000) {
        logger.info(
          `Worker ${workerIndex} has no need to run since ${totalProcessed} documents were already processed `
        );
        return resolve(null);
      }
      const worker = new Worker(Path.join(__dirname, './worker.js'), {
        workerData: {
          runOptions,
          bucketFrom,
          bucketTo,
          workerIndex,
          workerMaxDocs: runOptions.maxDocs ? runOptions.maxDocs : undefined,
        },
      });
      worker.on('message', (message: WorkerMessages) => {
        if ('workerIndex' in message) {
          if (!runOptions.maxDocs) return;
          if ('processedDocuments' in message) {
            totalProcessed += message.processedDocuments;
            workerProcessed[workerIndex].total += message.processedDocuments;
            const check = Math.round(totalProcessed / 10000) * 10000;
            if (check % (runOptions.maxDocs / 20) === 0) {
              logger.info(`processed: ${totalProcessed} documents`);
            }
          }
          if ('firstTimestamp' in message)
            workerProcessed[message.workerIndex].firstTimestamp = message.firstTimestamp;
          if ('lastTimestamp' in message)
            workerProcessed[message.workerIndex].lastTimestamp = message.lastTimestamp;
        } else {
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
  return Promise.all(workers.map((worker) => limiter(() => worker()))).then(() => {
    console.table(workerProcessed)
    logger.info(totalProcessed);
  });
}
