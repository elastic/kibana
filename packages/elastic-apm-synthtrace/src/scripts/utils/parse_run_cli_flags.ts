/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';
import { LogLevel } from '../../lib/utils/create_logger';
import { RunCliFlags } from '../run';
import { intervalToMs } from './interval_to_ms';

export function parseRunCliFlags(flags: RunCliFlags) {
  const { file, _, logLevel, interval, bucketSize } = flags;

  const parsedFile = String(file || _[0]);

  let parsedLogLevel = LogLevel.info;
  switch (logLevel) {
    case 'trace':
      parsedLogLevel = LogLevel.trace;
      break;

    case 'info':
      parsedLogLevel = LogLevel.info;
      break;

    case 'debug':
      parsedLogLevel = LogLevel.debug;
      break;

    case 'error':
      parsedLogLevel = LogLevel.error;
      break;
  }

  const intervalInMs = intervalToMs(interval);
  if (!intervalInMs) {
    throw new Error('Invalid interval');
  }

  const bucketSizeInMs = intervalToMs(bucketSize);

  if (!bucketSizeInMs) {
    throw new Error('Invalid bucket size');
  }

  return {
    ...pick(
      flags,
      'maxDocs',
      'target',
      'cloudId',
      'username',
      'password',
      'workers',
      'clientWorkers',
      'batchSize',
      'writeTarget',
      'numShards',
      'scenarioOpts',
      'dryRun'
    ),
    intervalInMs,
    bucketSizeInMs,
    logLevel: parsedLogLevel,
    file: parsedFile,
  };
}

export type RunOptions = ReturnType<typeof parseRunCliFlags>;
