/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray } from 'lodash';
import { memoryUsage } from 'process';
import { timerange } from '@kbn/apm-synthtrace-client';
import { Logger } from '../../lib/utils/create_logger';
import { SynthtraceClients } from './get_clients';
import { getScenario } from './get_scenario';
import { WorkerData } from './synthtrace_worker';

export async function indexHistoricalData({
  bucketFrom,
  bucketTo,
  runOptions,
  workerId,
  logger,
  clients,
  from,
  to,
}: WorkerData & { logger: Logger; clients: SynthtraceClients }) {
  const file = runOptions.file;

  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  logger.info(
    `Running scenario from ${bucketFrom.toISOString()} to ${bucketTo.toISOString()} (pid: ${
      process.pid
    })`
  );

  const { generate } = await scenario({ ...runOptions, logger, from, to });

  logger.debug('Generating scenario');

  const generatorsAndClients = logger.perf('generate_scenario', () =>
    generate({
      range: timerange(bucketFrom, bucketTo, logger),
      clients,
    })
  );

  const generatorsAndClientsArray = castArray(generatorsAndClients);

  logger.debug('Indexing scenario');

  function mb(value: number): string {
    return Math.round(value / 1024 ** 2).toString() + 'mb';
  }

  let cpuUsage = process.cpuUsage();

  setInterval(async () => {
    cpuUsage = process.cpuUsage(cpuUsage);
    const mem = memoryUsage();
    logger.debug(
      `cpu time: (user: ${Math.round(cpuUsage.user / 1000)}mss, sys: ${Math.round(
        cpuUsage.system / 1000
      )}ms), memory: ${mb(mem.heapUsed)}/${mb(mem.heapTotal)}`
    );
  }, 5000);

  await logger.perf('index_scenario', async () => {
    const promises = generatorsAndClientsArray.map(async ({ client, generator }) => {
      await client.index(generator);
      await client.refresh();
    });

    await Promise.all(promises);
  });
}
