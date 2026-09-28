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
 * Lazily rolls the data stream over when its write index has older mappings than the index template.
 * Idempotent: several Kibana nodes marking the same data stream result in a single rollover.
 */
export async function rolloverIfWriteIndexOutdated({
  logger,
  elasticsearchClient,
  existingDataStream,
  templateMappingsVersion,
}: {
  logger: Logger;
  elasticsearchClient: ElasticsearchClient;
  existingDataStream: api.IndicesDataStream;
  templateMappingsVersion: number | undefined;
}): Promise<void> {
  const { name, indices, rollover_on_write: rolloverOnWrite } = existingDataStream;

  // An index template without a mappings version predates the rollover strategy: there is nothing
  // to compare the write index against until the next version is released.
  if (rolloverOnWrite || templateMappingsVersion === undefined) {
    return;
  }

  const { index_name: writeIndexName } = indices[indices.length - 1];
  const { [writeIndexName]: writeIndexMappings } = await retryEs(
    () =>
      elasticsearchClient.indices.getMapping({
        index: writeIndexName,
        // A write index without a mappings version is omitted from the filtered response.
        filter_path: ['*.mappings._meta.version'],
      }),
    { logger, dataStreamName: name }
  );
  const writeIndexMappingsVersion = getMappingsVersion(writeIndexMappings?.mappings);

  if (
    writeIndexMappingsVersion !== undefined &&
    writeIndexMappingsVersion >= templateMappingsVersion
  ) {
    logger.debug(`Write index ${writeIndexName} of ${name} has up to date mappings.`);
    return;
  }

  const writeIndexVersionLabel = writeIndexMappingsVersion ?? '(none)';
  logger.info(
    `Rolling over data stream ${name} on next write: write index ${writeIndexName} has mappings v${writeIndexVersionLabel}, index template has v${templateMappingsVersion}.`
  );
  await retryEs(() => elasticsearchClient.indices.rollover({ alias: name, lazy: true }), {
    logger,
    dataStreamName: name,
  });
}
