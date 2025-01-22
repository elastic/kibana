/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ClientOptions as ESClientOptions } from '@elastic/elasticsearch';
import { Client as ESClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createFailError } from '@kbn/dev-cli-errors';

/**
 * Get an Elasticsearch client for which connectivity has been validated
 *
 * @param options Elasticsearch client options
 * @param log Logger instance
 * @throws FailError if cluster information cannot be read from the target Elasticsearch instance
 */
export async function getValidatedESClient(
  options: ESClientOptions,
  log: ToolingLog
): Promise<ESClient> {
  const es = new ESClient(options);

  await es.info().then(
    (esInfo) => {
      log.info(`Connected to Elasticsearch node '${esInfo.name}'`);
    },
    (err) => {
      throw createFailError(`Failed to connect to Elasticsearch\n${err}`);
    }
  );

  return es;
}
