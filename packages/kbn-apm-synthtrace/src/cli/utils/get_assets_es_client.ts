/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { AssetsSynthtraceEsClient } from '../../lib/assets/assets_synthtrace_es_client';
import { Logger } from '../../lib/utils/create_logger';
import { RunOptions } from './parse_run_cli_flags';
import { getEsClientTlsSettings } from './ssl';

export function getAssetsEsClient({
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

  return new AssetsSynthtraceEsClient({
    client,
    logger,
    concurrency,
    refreshAfterIndex: true,
  });
}
