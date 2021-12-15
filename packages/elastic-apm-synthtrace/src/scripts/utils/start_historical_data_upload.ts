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
import { ApmFields } from '../../lib/apm/apm_fields';

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

  const events = logger.perf('execute_scenario', () => generate({ from, to }));

  await client.helpers.bulk<ApmFields>({
    datasource: events[Symbol.asyncIterator](),
    onDocument: (doc) => {
      return { index: { _index: '' } };
    },
    concurrency: clientWorkers,
  });
}
