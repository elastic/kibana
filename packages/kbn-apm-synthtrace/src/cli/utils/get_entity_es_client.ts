/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { Logger } from '../../lib/utils/create_logger';
import { RunOptions } from './parse_run_cli_flags';
import { EntitySynthtraceEsClient } from '../../lib/entity/entity_syntrace_es_client';
import { getEsClientTlsSettings } from './ssl';

export function getEntityEsClient({
  target,
  logger,
  concurrency,
}: Pick<RunOptions, 'concurrency'> & {
  target: string;
  logger: Logger;
}) {
  const client = new Client({
    node: target,
    tls: getEsClientTlsSettings(target),
  });

  return new EntitySynthtraceEsClient({
    client,
    logger,
    concurrency,
    refreshAfterIndex: true,
  });
}
