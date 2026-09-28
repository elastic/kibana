/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as api from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { retryEs } from '../retry_es';

/**
 * Stamps mappings with the definition version, so each backing index created from the index
 * template records the mappings version it was created with.
 */
export const withMappingsVersion = (
  mappings: api.MappingTypeMapping | undefined,
  version: number
): api.MappingTypeMapping => ({ ...mappings, _meta: { ...mappings?._meta, version } });

export const getMappingsVersion = (
  mappings: api.MappingTypeMapping | undefined
): number | undefined => {
  const version = mappings?._meta?.version;
  return typeof version === 'number' ? version : undefined;
};

/**
 * Lazily rolls the data stream over when its write index was created from older mappings than the
 * index template's, so that the next write creates a backing index with the current mappings.
 *
 * Lazy rollovers are idempotent: data streams already marked for rollover are skipped, and several
 * Kibana nodes marking the same data stream result in a single rollover on the next write.
 */
export async function rolloverIfWriteIndexOutdated({
  logger,
  elasticsearchClient,
  dataStream,
  templateMappingsVersion,
}: {
  logger: Logger;
  elasticsearchClient: ElasticsearchClient;
  dataStream: api.IndicesDataStream;
  templateMappingsVersion: number | undefined;
}): Promise<void> {
  const { name, indices, rollover_on_write: rolloverOnWrite } = dataStream;
  const writeIndex = indices[indices.length - 1];

  // An index template without a mappings version predates the rollover strategy: there is nothing
  // to compare the write index against until the next version is released.
  if (!writeIndex || rolloverOnWrite || templateMappingsVersion === undefined) {
    return;
  }

  const { [writeIndex.index_name]: writeIndexMappings } = await retryEs(
    () => elasticsearchClient.indices.getMapping({ index: writeIndex.index_name }),
    { logger, dataStreamName: name }
  );
  const writeIndexMappingsVersion = getMappingsVersion(writeIndexMappings?.mappings);

  if (
    writeIndexMappingsVersion !== undefined &&
    writeIndexMappingsVersion >= templateMappingsVersion
  ) {
    logger.debug(`Write index ${writeIndex.index_name} of ${name} has up to date mappings.`);
    return;
  }

  logger.info(
    `Rolling over data stream ${name} on next write: write index ${
      writeIndex.index_name
    } has mappings v${
      writeIndexMappingsVersion ?? '(none)'
    }, index template has v${templateMappingsVersion}.`
  );
  await retryEs(() => elasticsearchClient.indices.rollover({ alias: name, lazy: true }), {
    logger,
    dataStreamName: name,
  });
}
