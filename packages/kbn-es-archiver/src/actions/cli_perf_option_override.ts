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

const isStringOptRequested = (opt: string | boolean | string[] | undefined) =>
  typeof opt === 'string' && opt !== '';

const protect = (
  batchSize: string | boolean | string[] | undefined,
  concurrency: string | boolean | string[] | undefined
) =>
  [batchSize, concurrency].forEach((x): void => {
    if (Number.isNaN(parseInt(x as string, 10))) {
      throw createFlagError(
        `invalid argument, please use a number for --batch-size & for --concurrency.
Provided: --batch-size: [ ${batchSize || 'n/a'} ], --concurrency: [ ${concurrency || 'n/a'} ]`
      );
    }
  });

export const cliPerfOptionOverride = async (
  useCreate: boolean,
  docsOnly: boolean,
  path: string,
  flags: Flags,
  esArchiver: EsArchiver
): Promise<void> => {
  const batchSize = flags['batch-size'];
  const concurrency = flags.concurrency;

  protect(batchSize, concurrency);

  const batchRequested = isStringOptRequested(batchSize);
  const concurrencyRequested = isStringOptRequested(concurrency);

  if (!batchRequested && !concurrencyRequested) {
    await esArchiver.load(path, {
      useCreate,
      docsOnly,
      performance: {
        batchSize: parseInt(batchSize as string, 10),
      },
    });
    return;
  }

  if (batchRequested && !concurrencyRequested) {
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
