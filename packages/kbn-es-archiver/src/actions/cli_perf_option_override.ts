/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Flags } from '@kbn/dev-cli-runner';
import { FlagsReader } from '@kbn/dev-cli-runner';
import { EsArchiver } from '../es_archiver';

export const cliPerfOptionOverride = async (
  useCreate: boolean,
  docsOnly: boolean,
  path: string,
  flags: Flags,
  esArchiver: EsArchiver
): Promise<void> => {
  const flagsReader = new FlagsReader(flags);

  await esArchiver.load(path, {
    useCreate,
    docsOnly,
    performance: {
      batchSize: flagsReader.number('batch-size'),
      concurrency: flagsReader.number('concurrency'),
    },
  });
};
