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
import { bootstrap } from './bootstrap';
import type { RunOptions } from './parse_run_cli_flags';
import { getScenario } from './get_scenario';
import { StreamManager } from './stream_manager';
import { indexData } from './index_data';
import { runWorker } from './workers/run_worker';
import type { WorkerData } from './workers/historical_data/synthtrace_historical_data_worker';

export async function startHistoricalDataUpload({
  runOptions,
  from,
  to,
}: {
  runOptions: RunOptions;
  from: number;
  to: number;
}) {
  const { logger, clients, kibanaClient, esClient } = await bootstrap(runOptions);

  const files = runOptions.files;

  const scenarios = await logger.perf('get_scenario', async () =>
    Promise.all(
      files.map(async (file) => {
        const fn = await getScenario({ file, logger });
        return fn({
          ...runOptions,
          logger,
          from,
          to,
        });
      })
    )
  );

  const teardown = once(async () => {
    await Promise.all(
      scenarios.map(async (scenario) => {
        if (scenario.teardown) {
          return scenario.teardown(clients, kibanaClient, esClient);
        }
      })
    );
  });

  const streamManager = new StreamManager(logger, teardown);

  await Promise.all(
    scenarios.map(async (scenario) => {
      if (scenario.bootstrap) {
        return scenario.bootstrap(clients, kibanaClient, esClient);
      }
    })
  );

  const cores = cpus().length;

  let workers = Math.min(runOptions.workers ?? 10, cores - 1);

  const diff = moment(from).diff(to);

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

  logger.info(
    `Generating data from ${new Date(from).toISOString()} to ${new Date(to).toISOString()}`
  );

  function rangeStep(interval: number) {
    if (from > to) return moment(from).subtract(interval, 'ms').toDate();
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
      file: files[index % files.length],
    }));

  const workerServices =
    intervals.length === 1
      ? // just run in this process. it's hard to attach
        // a debugger to a worker_thread, see:
        // https://issues.chromium.org/issues/41461728
        files.map((file) =>
          indexData({
            file,
            bucketFrom: intervals[0].bucketFrom,
            bucketTo: intervals[0].bucketTo,
            clients,
            logger,
            runOptions,
            workerId: 'i',
            from,
            to,
            streamManager,
          })
        )
      : range(0, intervals.length).map((index) =>
          runWorker<WorkerData>({
            logger,
            streamManager,
            workerIndex: index,
            workerScriptPath: Path.join(__dirname, './workers/historical_data/worker.js'),
            workerData: { ...intervals[index], workerId: index.toString(), from, to, runOptions },
          })
        );

  await Promise.race(workerServices);

  await teardown();
}
