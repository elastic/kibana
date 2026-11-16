/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { esqlFixtureDocumentRequests } from './documents';
import { esqlFixtureIndicesCreateRequests } from './indices';

/**
 * Creates the fixture indices and seeds the sample documents. Fails fast: without
 * the fixtures every `EsqlExecution` score drops to 0 for reasons unrelated to
 * the model.
 */
export async function setupEsqlFixtures({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  log.info('[workflows-esql] creating fixture indices');

  await Promise.all(
    esqlFixtureIndicesCreateRequests.map(async (request) => {
      try {
        await esClient.indices.create(request);
      } catch (err) {
        const cause = err as { meta?: { body?: { error?: { type?: string } } } };
        if (cause?.meta?.body?.error?.type === 'resource_already_exists_exception') {
          log.debug(`[workflows-esql] index already exists, skipping: ${request.index}`);
          return;
        }
        throw new Error(`[workflows-esql] failed to create index "${request.index}"`, {
          cause: err instanceof Error ? err : new Error(String(err)),
        });
      }
    })
  );

  log.info(`[workflows-esql] indexing ${esqlFixtureDocumentRequests.length} sample documents`);

  for (const request of esqlFixtureDocumentRequests) {
    try {
      await esClient.index({ ...request, refresh: 'wait_for' });
    } catch (err) {
      throw new Error(`[workflows-esql] failed to index sample document into "${request.index}"`, {
        cause: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  await esClient.indices.refresh({
    index: esqlFixtureIndicesCreateRequests
      .map((req) => req.index)
      .concat(esqlFixtureDocumentRequests.map((req) => req.index)),
  });
}
