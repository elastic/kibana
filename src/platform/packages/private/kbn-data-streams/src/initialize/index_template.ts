/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type api from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { retryEs } from '../retry_es';
import type { AnyDataStreamDefinition } from '../types';
import { applyDefaults } from './defaults';
import { buildIndexTemplateBody } from './template_body';

/**
 * https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
 *
 * Endeavour to be idempotent and race-condition safe.
 */
export async function initializeIndexTemplate({
  logger,
  dataStream,
  elasticsearchClient,
  existingIndexTemplate,
  deployedVersion,
  skipCreation = true,
}: {
  logger: Logger;
  dataStream: AnyDataStreamDefinition;
  elasticsearchClient: ElasticsearchClient;
  existingIndexTemplate: api.IndicesGetIndexTemplateIndexTemplateItem | undefined;
  deployedVersion: number | undefined;
  skipCreation?: boolean;
}): Promise<{ uptoDate: boolean }> {
  const version = dataStream.version;
  logger.debug(`Setting up index template for data stream: ${dataStream.name} v${version}`);

  const previousVersions: number[] = [];
  dataStream = applyDefaults(dataStream);

  if (skipCreation && !existingIndexTemplate) {
    // index template does not exist so it is not updated.
    logger.debug(
      `Skipping index template creation during lazy initialization: ${dataStream.name}.`
    );
    return { uptoDate: false };
  }

  // index template exists so we always update it.
  if (existingIndexTemplate && deployedVersion !== undefined) {
    logger.debug(`Index template already exists: ${dataStream.name}, updating it.`);

    if (deployedVersion >= version) {
      // index already applied and updated.
      logger.debug(`Deployed ${dataStream.name} v${deployedVersion} already applied and updated.`);
      return { uptoDate: true };
    }
    previousVersions.push(
      deployedVersion,
      ...existingIndexTemplate.index_template?._meta?.previousVersions
    );
  }

  logger.debug(`Putting index template: ${dataStream.name}.`);
  // Should be idempotent
  await retryEs(
    () =>
      elasticsearchClient.indices.putIndexTemplate({
        name: dataStream.name,
        ...buildIndexTemplateBody(dataStream, previousVersions),
      }),
    { logger, dataStreamName: dataStream.name }
  );

  // index template updated
  return { uptoDate: true };
}
