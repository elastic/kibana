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

export function parseRunCliFlags(flags: RunCliFlags) {
  const { file, _, logLevel } = flags;

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

  return {
    ...pick(
      flags,
      'maxDocs',
      'maxDocsConfidence',
      'target',
      'cloudId',
      'username',
      'password',
      'workers',
      'flushSizeBulk',
      'flushSize',
      'numShards',
      'scenarioOpts',
      'forceLegacyIndices',
      'dryRun',
      'gcpRepository'
    ),
    logLevel: parsedLogLevel,
    file: parsedFile,
  };
}

export type RunOptions = ReturnType<typeof parseRunCliFlags>;
