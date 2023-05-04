/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

  if (filepath) {
    // eslint-disable-next-line no-console
    console.log(`Loading scenario from ${filepath}`);
    return filepath;
  }

  throw new Error(`Could not find scenario file: "${parsedFile}"`);
}

export function parseRunCliFlags(flags: RunCliFlags) {
  const { logLevel } = flags;
  const parsedFile = getParsedFile(flags);

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
      'target',
      'workers',
      'scenarioOpts',
      'kibana',
      'concurrency',
      'versionOverride',
      'clean'
    ),
    logLevel: parsedLogLevel,
    file: parsedFile,
  };
}

export type RunOptions = ReturnType<typeof parseRunCliFlags>;
