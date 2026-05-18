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
import { assertDeployedVersion } from './assert_deployed_version';

/**
 * https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
 *
 * Endeavour to be idempotent and race-condition safe.
 *
 * Phase order: update the index template first, then apply putMapping to the existing write
 * index. This ensures any rollover that occurs between the two phases produces a new write
 * index with the correct mappings from the updated template.
 *
 * Retry safety (elastic/kibana#268853): `initializeDataStream` always runs unconditionally —
 * it has no version short-circuit — so a putMapping failure on a previous boot is always
 * retried on the next init, regardless of the `_meta.version` on disk.
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

  // Validate `_meta.version` once at the boundary; downstream steps trust the typed value.
  const deployedVersion = existingIndexTemplate
    ? assertDeployedVersion(existingIndexTemplate, dataStream.name)
    : undefined;

  // The index template is created and updated in all cases except if the data stream does not exist and we will not create it now.
  const createIndexTemplateIfDoesntExist = existingDataStream ? true : !lazyCreation;

  // Phase 1: install / update the index template. Any rollover that occurs after this point
  // will pick up the new mappings from the updated template.
  const { uptoDate: indexTemplateReady } = await initializeIndexTemplate({
    logger,
    dataStream,
    elasticsearchClient,
    existingIndexTemplate,
    deployedVersion,
    skipCreation: !createIndexTemplateIfDoesntExist,
  });

  // Phase 2: apply mappings to the existing write index. Runs unconditionally (no version
  // short-circuit) so a putMapping failure on a previous boot is always retried.
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
