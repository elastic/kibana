/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// import pLimit from 'p-limit';
import moment from 'moment';
import { RunOptions } from './parse_run_cli_flags';
import { getScenario } from './get_scenario';
import { ApmSynthtraceEsClient } from '../../lib/apm';
import { Logger } from '../../lib/utils/create_logger';
import { StreamToBulkOptions } from '../../lib/apm/client/apm_synthtrace_es_client';

export async function startHistoricalDataUpload(
  esClient: ApmSynthtraceEsClient,
  logger: Logger,
  runOptions: RunOptions,
  from: Date,
  to: Date
) {
  // if we want to generate a maximum number of documents reverse generation to descend.
  [from, to] = runOptions.maxDocs ? [to, from] : [from, to];

  const file = runOptions.file;
  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  const { generate, mapToIndex } = await scenario(runOptions);
  /*
  const numBatches = Math.ceil((to - from) / bucketSizeInMs);
  const limiter = pLimit(runOptions.workers);
  return Promise.all(new Array(numBatches).fill(undefined).map((_) => limiter(processNextBatch)));
*/

  const events = logger.perf('generate_scenario', () => generate({ from, to }));
  const ratePerMinute = events.ratePerMinute();
  logger.info(
    `Scenario is generating ${ratePerMinute.toLocaleString()} events per minute interval`
  );
  let to2 = to;
  if (runOptions.maxDocs) {
    to2 = moment(from)
      // ratePerMinute() is not exact if the generator is yielding variable documents
      // the rate is calculated by peeking the first yielded event and its children.
      // for real complex cases manually specifying --to is encouraged.
      .subtract((runOptions.maxDocs / ratePerMinute) * 2, 'm')
      .toDate();
    const diff = moment(from).diff(to2);
    const d = moment.duration(diff, 'ms');
    logger.info(
      `Estimated interval length ${d.days()} days, ${d.hours()} hours ${d.minutes()} minutes ${d.seconds()} seconds`
    );
  }

  logger.info(`Generating data from ${from.toISOString()} to ${to2.toISOString()}`);

  const streamToBulkOptions: StreamToBulkOptions = {
    concurrency: runOptions.clientWorkers,
    maxDocs: runOptions.maxDocs,
    mapToIndex,
  };

  if (runOptions.dryRun) {
    streamToBulkOptions.dryRunCallBack = (yielded, item, done) => {
      if (yielded === 0) {
        logger.info(`First item: ${item!['@timestamp']}`);
      }
      if (done && item) {
        logger.info(`Last item: ${item['@timestamp']}`);
      }
    };
  }

  await logger.perf('index_scenario', () => esClient.index(events, streamToBulkOptions));
}
