/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client as ESClient, ClientOptions as ESClientOptions } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { createFailError } from '@kbn/dev-cli-errors';

/**
 * Get an Elasticsearch client for which connectivity has been validated
 *
 * @param options Elasticsearch client options
 * @param log Logger instance
 * @param cli Set to `true` when invoked from a CLI context
 * @throws FailError if cluster information cannot be read from the target Elasticsearch instance
 */
export async function getValidatedESClient(
  options: ESClientOptions,
  log?: ToolingLog,
  cli: boolean = false
): Promise<ESClient> {
  const es = new ESClient(options);

  await es.info().then(
    (esInfo) => {
      if (log !== undefined) {
        log.info(`Connected to Elasticsearch node '${esInfo.name}'`);
      }
    },
    (err) => {
      const msg = `Failed to connect to Elasticsearch\n${err}`;
      throw cli ? createFailError(msg) : Error(msg);
    }
  );

  return es;
}
