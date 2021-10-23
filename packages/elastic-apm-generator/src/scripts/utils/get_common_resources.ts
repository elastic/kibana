/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { getScenario } from './get_scenario';
import { getWriteTargets } from './get_write_targets';
import { intervalToMs } from './interval_to_ms';
import { createLogger, LogLevel } from './logger';

export async function getCommonResources({
  file,
  interval,
  bucketSize,
  workers,
  target,
  clean,
  logLevel,
}: {
  file: unknown;
  interval: unknown;
  bucketSize: unknown;
  workers: unknown;
  target: unknown;
  clean: boolean;
  logLevel: unknown;
}) {
  let parsedLogLevel = LogLevel.info;
  switch (logLevel) {
    case 'info':
      parsedLogLevel = LogLevel.info;
      break;

    case 'debug':
      parsedLogLevel = LogLevel.debug;
      break;

    case 'quiet':
      parsedLogLevel = LogLevel.quiet;
      break;
  }

  const logger = createLogger(parsedLogLevel);

  const intervalInMs = intervalToMs(interval);
  if (!intervalInMs) {
    throw new Error('Invalid interval');
  }

  const bucketSizeInMs = intervalToMs(bucketSize);

  if (!bucketSizeInMs) {
    throw new Error('Invalid bucket size');
  }

  const client = new Client({
    node: String(target),
  });

  const [scenario, writeTargets] = await Promise.all([
    getScenario({ file, logger }),
    getWriteTargets({ client }),
  ]);

  return {
    scenario,
    writeTargets,
    logger,
    client,
    intervalInMs,
    bucketSizeInMs,
    workers: Number(workers),
    target: String(target),
    clean,
  };
}
