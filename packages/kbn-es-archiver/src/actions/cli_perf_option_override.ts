/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import { Flags } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { EsArchiver } from '../es_archiver';

type StringOption = string | boolean | string[] | undefined;
const isStringOptRequested = (opt: StringOption) => typeof opt === 'string' && opt !== '';

const protect = (x: StringOption) => {
  if (Number.isNaN(parseInt(x as string, 10)))
    throw createFlagError('invalid argument, please use a number');
};

export const cliPerfOptionOverride = async (
  useCreate: boolean,
  docsOnly: boolean,
  path: string,
  flags: Flags,
  esArchiver: EsArchiver,
  log: ToolingLog
): Promise<void> => {
  const batchSize = flags['batch-size'];
  const concurrency = flags.concurrency;

  const batchRequested = isStringOptRequested(batchSize);
  const concurrencyRequested = isStringOptRequested(concurrency);

  if (!batchRequested && !concurrencyRequested) {
    log.debug('No performance option override requested.');
    await esArchiver.load(path, {
      useCreate,
      docsOnly,
    });
    return;
  }

  if (batchRequested && !concurrencyRequested) {
    log.debug('Performance option override requested; batch size only');
    protect(batchSize);
    await esArchiver.load(path, {
      useCreate,
      docsOnly,
      performance: {
        batchSize: parseInt(batchSize as string, 10),
      },
    });
    return;
  }
  if (concurrencyRequested && !batchRequested) {
    log.debug('Performance option override requested; concurrency only');
    protect(concurrency);
    await esArchiver.load(path, {
      useCreate,
      docsOnly,
      performance: {
        concurrency: parseInt(concurrency as string, 10),
      },
    });
    return;
  }

  if (batchRequested && concurrencyRequested) {
    log.debug('Performance option override requested; batch size and concurrency');
    [batchSize, concurrency].forEach(protect);
    await esArchiver.load(path, {
      useCreate,
      docsOnly,
      performance: {
        batchSize: parseInt(batchSize as string, 10),
        concurrency: parseInt(concurrency as string, 10),
      },
    });
    return;
  }
};
