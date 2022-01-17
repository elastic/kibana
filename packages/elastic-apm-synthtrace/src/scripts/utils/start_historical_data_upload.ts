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

export async function startHistoricalDataUpload(esClient: ApmSynthtraceEsClient, logger: Logger, runOptions: RunOptions, from: Date, to: Date) {

  const file = runOptions.file;
  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  const { generate } = await scenario(runOptions);

  const events = logger.perf('generate_scenario', () => generate({ from, to }));

  const clientWorkers = runOptions.clientWorkers;
  await logger.perf('index_scenario', () => esClient.index(events, clientWorkers));

}
