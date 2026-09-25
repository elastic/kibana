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
import type { AnyDataStreamDefinition } from '../types';
import { initializeDataStream } from './data_stream';
import { initializeIndexTemplate } from './index_template';
import { getExistingDataStream, getExistingIndexTemplate } from './exists_checks';

/**
 * https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
 *
 * Endeavour to be idempotent and race-condition safe.
 */
export async function initialize({
  logger,
  dataStream,
  elasticsearchClient,
  lazyCreation,
  devMode,
}: {
  logger: Logger;
  dataStream: AnyDataStreamDefinition;
  elasticsearchClient: ElasticsearchClient;
  lazyCreation?: boolean;
  /** When true, additional safety checks run that would be too expensive for production. */
  devMode?: boolean;
}) {
  logger = logger.get('data-streams-setup');
  logger.debug(`Setting up index template for data stream: ${dataStream.name}`);

  if (!dataStream.name) {
    throw new Error('Data stream name is required');
  }

  const existingDataStream = await getExistingDataStream(
    elasticsearchClient,
    dataStream.name,
    logger
  );
  const existingIndexTemplate = await getExistingIndexTemplate(
    elasticsearchClient,
    dataStream.name,
    logger
  );

  // The index template is created and updated in all cases except if the data stream does not exist and we will not create it now.
  const createIndexTemplateIfDoesntExist = existingDataStream ? true : !lazyCreation;
  // create the data stream only if not lazy.
  const createDataStreamIfDoesntExist = !lazyCreation;

  const { uptoDate: indexTemplateReady } = await initializeIndexTemplate({
    logger,
    dataStream,
    elasticsearchClient,
    existingIndexTemplate,
    skipCreation: !createIndexTemplateIfDoesntExist,
  });

  const { uptoDate: dataStreamReady } = await initializeDataStream({
    logger,
    dataStream,
    elasticsearchClient,
    existingDataStream,
    existingIndexTemplate,
    skipCreation: !createDataStreamIfDoesntExist,
  });

  const isReady = indexTemplateReady && dataStreamReady;

  if (devMode && dataStream.system === true && isReady) {
    await verifySystemDataStream({
      logger,
      dataStream,
      elasticsearchClient,
      // Reuse the pre-creation snapshot when the stream already existed; re-fetch when it was
      // just created (existingDataStream was undefined at that point).
      cachedDataStream: existingDataStream,
    });
  }

  return { dataStreamReady: isReady };
}

/**
 * In dev/CI mode: confirm that Elasticsearch considers this data stream a system data stream.
 *
 * A stream is only protected by ES when a `SystemDataStreamDescriptor` has been registered for
 * it. If that descriptor is missing the stream will be created without the `system: true` flag
 * and backing indices won't inherit system-index protections — a silent data-exposure risk.
 * Throwing here surfaces the misconfiguration before it can reach production.
 */
async function verifySystemDataStream({
  logger,
  dataStream,
  elasticsearchClient,
  cachedDataStream,
}: {
  logger: Logger;
  dataStream: AnyDataStreamDefinition;
  elasticsearchClient: ElasticsearchClient;
  cachedDataStream: Awaited<ReturnType<typeof getExistingDataStream>>;
}) {
  // When the stream already existed we have its metadata; when it was just created we must
  // fetch it now so we see the post-creation ES state.
  const streamInfo =
    cachedDataStream ?? (await getExistingDataStream(elasticsearchClient, dataStream.name, logger));

  if (!streamInfo?.system) {
    throw new Error(
      `[DEV] Data stream "${dataStream.name}" is defined with \`system: true\` but ` +
        `Elasticsearch does not report it as a system data stream. ` +
        `Ensure a SystemDataStreamDescriptor is registered with Elasticsearch for this stream ` +
        `before initialising it in Kibana, or set \`system: false\` in the definition if this ` +
        `stream does not need system-level protection. See kibana-team#3797 for details.`
    );
  }

  logger.debug(`Verified system data stream: ${dataStream.name}`);
}
