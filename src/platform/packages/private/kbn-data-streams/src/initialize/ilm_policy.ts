/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { retryEs } from '../retry_es';
import type { AnyDataStreamDefinition } from '../types';

export async function initializeIlmPolicy({
  logger,
  dataStream,
  elasticsearchClient,
}: {
  logger: Logger;
  dataStream: AnyDataStreamDefinition;
  elasticsearchClient: ElasticsearchClient;
}): Promise<{ uptoDate: boolean }> {
  const { ilmPolicy } = dataStream;
  if (!ilmPolicy) {
    return { uptoDate: true };
  }

  logger.debug(`Setting up ILM policy ${ilmPolicy.name} for data stream: ${dataStream.name}`);

  await retryEs(() =>
    elasticsearchClient.ilm.putLifecycle({
      name: ilmPolicy.name,
      policy: ilmPolicy.policy,
    })
  );

  return { uptoDate: true };
}
