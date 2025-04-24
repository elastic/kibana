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

function getParsedFiles(flags: RunCliFlags) {
  const { _: parsedFiles } = flags;

  if (!parsedFiles.length) {
    throw new Error('Please specify at least one scenario to run');
  }

  const filesPath = parsedFiles.map((parsedFile) => {
    const foundPath = [
      path.resolve(parsedFile),
      path.resolve(`${parsedFile}.ts`),
      path.resolve(__dirname, '../../scenarios', parsedFile),
      path.resolve(__dirname, '../../scenarios', `${parsedFile}.ts`),
      path.resolve(__dirname, '../../scenarios', `${parsedFile}.js`),
    ].find((p) => existsSync(p));

    if (!foundPath) {
      throw new Error(`Could not find scenario file for: "${parsedFile}"`);
    }

    return foundPath;
  });

  return filesPath;
}

export function parseRunCliFlags(flags: RunCliFlags) {
  const { logLevel, target, debug, verbose } = flags;
  if (target?.includes('.kb.')) {
    throw new Error(`Target URL seems to be a Kibana URL, please provide Elasticsearch URL`);
  }
  const parsedFiles = getParsedFiles(flags);

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
      'liveBucketSize',
      'uniqueIds'
    ),
    scenarioOpts: flags.scenarioOpts as unknown as Record<string, any>,
    logLevel: parsedLogLevel,
    files: parsedFiles,
  };
}

export type RunOptions = ReturnType<typeof parseRunCliFlags>;
