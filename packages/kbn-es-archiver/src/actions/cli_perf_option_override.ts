/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import { Flags } from '@kbn/dev-cli-runner';
import { EsArchiver } from '../es_archiver';

type StringOption = string | boolean | string[] | undefined;
export const isStringOptProvided = (opt: StringOption) => typeof opt === 'string' && opt !== '';

export const parseNumberFlag = (x: StringOption): number | undefined => {
  if (isStringOptProvided(x)) {
    const parsed = parseInt(x as string, 10);
    if (Number.isNaN(parsed)) throw createFlagError('invalid argument, please use a number');
    return parsed;
  }
};

export const cliPerfOptionOverride = async (
  useCreate: boolean,
  docsOnly: boolean,
  path: string,
  flags: Flags,
  esArchiver: EsArchiver
): Promise<void> => {
  await esArchiver.load(path, {
    useCreate,
    docsOnly,
    performance: {
      batchSize: parseNumberFlag(flags['batch-size']),
      concurrency: parseNumberFlag(flags.concurrency),
    },
  });
};
