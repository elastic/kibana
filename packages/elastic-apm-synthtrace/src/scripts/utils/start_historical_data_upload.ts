/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getCommonServices } from './get_common_services';
import { RunOptions } from './parse_run_cli_flags';
import { getScenario } from './get_scenario';
import { apm } from '../../lib/apm';

export async function startHistoricalDataUpload({
  from,
  to,
  intervalInMs,
  bucketSizeInMs,
  workers,
  clientWorkers,
  batchSize,
  logLevel,
  target,
  file,
  writeTarget,
  scenarioOpts,
}: RunOptions & { from: Date; to: Date }) {
  const { logger, client } = getCommonServices({ target, logLevel });

  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  const { generate } = await scenario({
    intervalInMs,
    bucketSizeInMs,
    logLevel,
    file,
    clientWorkers,
    batchSize,
    target,
    workers,
    writeTarget,
  });

  const events = logger.perf('generate_scenario', () => generate({ from, to }));

  const apmClient = new apm.ApmSynthtraceEsClient(client, logger);
  await logger.perf('index_scenario', () => apmClient.index(events, clientWorkers));

}
