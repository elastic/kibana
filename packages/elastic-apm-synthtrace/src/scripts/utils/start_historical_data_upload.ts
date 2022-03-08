/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { RunOptions } from './parse_run_cli_flags';
import { getScenario } from './get_scenario';
import { ApmSynthtraceEsClient } from '../../lib/apm';
import { Logger } from '../../lib/utils/create_logger';
import { StreamProcessor } from '../../lib/stream_processor';

export async function startHistoricalDataUpload(
  esClient: ApmSynthtraceEsClient,
  logger: Logger,
  runOptions: RunOptions,
  from: Date,
  to: Date
) {
  const file = runOptions.file;
  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  const { generate, mapToIndex } = await scenario(runOptions);

  // if we want to generate a maximum number of documents reverse generation to descend.
  [from, to] = runOptions.maxDocs ? [to, from] : [from, to];

  logger.info(`Generating data from ${from} to ${to}`);

  const events = logger.perf('generate_scenario', () => generate({ from, to }));

  if (runOptions.dryRun) {
    const maxDocs = runOptions.maxDocs;
    const stream = new StreamProcessor({
      processors: StreamProcessor.apmProcessors,
      maxSourceEvents: maxDocs,
      logger,
    }).streamToDocument(StreamProcessor.toDocument, events);
    logger.perf('enumerate_scenario', () => {
      // @ts-ignore
      // We just want to enumerate
      let yielded = 0;
      for (const _ of stream) {
        yielded++;
      }
    });
    return;
  }

  const clientWorkers = runOptions.clientWorkers;
  await logger.perf('index_scenario', () =>
    esClient.index(events, {
      concurrency: clientWorkers,
      maxDocs: runOptions.maxDocs,
      mapToIndex,
    })
  );
}
