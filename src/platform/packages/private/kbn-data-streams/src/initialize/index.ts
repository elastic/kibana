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
import { initializeDataStream, createDataStream } from './data_stream';
import { initializeIndexTemplate } from './index_template';
import { getExistingDataStream, getExistingIndexTemplate } from './exists_checks';

/**
 * https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
 *
 * Endeavour to be idempotent and race-condition safe.
 *
 * Phase order is load-bearing (see elastic/kibana#268853): migrate the existing write index
 * BEFORE bumping the index template's `_meta.version`. If migration fails, the on-disk
 * `_meta.version` stays at the old number and the next init can retry the migration cleanly.
 */
export async function initialize({
  logger,
  dataStream,
  elasticsearchClient,
  lazyCreation,
}: {
  logger: Logger;
  dataStream: AnyDataStreamDefinition;
  elasticsearchClient: ElasticsearchClient;
  lazyCreation?: boolean;
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

  // Phase 1: migrate the existing data stream's write index. Resolves mappings from the NEW
  // template body (via inline `simulateTemplate`) and applies them with `putMapping`. Runs
  // BEFORE the template version is bumped so a migration failure leaves `_meta.version` on
  // disk untouched.
  let dataStreamReady: boolean;
  if (existingDataStream) {
    const { migrated } = await initializeDataStream({
      logger,
      dataStream,
      elasticsearchClient,
      existingDataStream,
      existingIndexTemplate,
    });
    // `migrated` is false only when the data stream has no write index yet.
    dataStreamReady = migrated;
  } else {
    dataStreamReady = false;
  }

  // Phase 2: install / update the index template. This is the last write that bumps
  // `_meta.version`, which acts as the "everything before this succeeded" marker.
  const { uptoDate: indexTemplateReady } = await initializeIndexTemplate({
    logger,
    dataStream,
    elasticsearchClient,
    existingIndexTemplate,
    skipCreation: !createIndexTemplateIfDoesntExist,
  });

  // Phase 3: create the data stream if it doesn't exist and we're not in lazy mode. Must
  // run AFTER the index template is in place, otherwise ES has no template to bind to.
  if (!existingDataStream && !lazyCreation) {
    await createDataStream({ logger, dataStream, elasticsearchClient });
    dataStreamReady = true;
  }

  return {
    dataStreamReady: indexTemplateReady && dataStreamReady,
  };
}
