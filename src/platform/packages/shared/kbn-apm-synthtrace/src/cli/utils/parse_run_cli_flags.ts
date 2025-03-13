/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import { pick } from 'lodash';
import path from 'path';
import { LogLevel } from '../../lib/utils/create_logger';
import { RunCliFlags } from '../run_synthtrace';

function getParsedFile(flags: RunCliFlags) {
  const { file, _ } = flags;
  const parsedFile = (file || _[0]) as string;

  if (!parsedFile) {
    throw new Error('Please specify a scenario to run');
  }

  const filepath = [
    path.resolve(parsedFile),
    path.resolve(`${parsedFile}.ts`),
    path.resolve(__dirname, '../../scenarios', parsedFile),
    path.resolve(__dirname, '../../scenarios', `${parsedFile}.ts`),
    path.resolve(__dirname, '../../scenarios', `${parsedFile}.js`),
  ].find((p) => existsSync(p));

  if (!filepath) {
    throw new Error(`Could not find scenario file: "${parsedFile}"`);
  }

  return filepath;
}

export function parseRunCliFlags(flags: RunCliFlags) {
  const { logLevel, target, debug, verbose } = flags;
  if (target?.includes('.kb.')) {
    throw new Error(`Target URL seems to be a Kibana URL, please provide Elasticsearch URL`);
  }
  const parsedFile = getParsedFile(flags);

  let parsedLogLevel = verbose ? LogLevel.verbose : debug ? LogLevel.debug : LogLevel.info;

  switch (logLevel) {
    case 'verbose':
      parsedLogLevel = LogLevel.verbose;
      break;

    case 'info':
      parsedLogLevel = LogLevel.info;
      break;

    case 'debug':
      parsedLogLevel = LogLevel.debug;
      break;

    case 'warn':
      parsedLogLevel = LogLevel.warn;
      break;

    case 'error':
      parsedLogLevel = LogLevel.error;
      break;
  }
  return {
    ...pick(
      flags,
      'target',
      'workers',
      'kibana',
      'concurrency',
      'versionOverride',
      'clean',
      'assume-package-version',
      'liveBucketSize'
    ),
    scenarioOpts: flags.scenarioOpts as unknown as Record<string, any>,
    logLevel: parsedLogLevel,
    file: parsedFile,
  };
}

export type RunOptions = ReturnType<typeof parseRunCliFlags>;
