/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

interface CreateIndexOptions {
  esClient: ElasticsearchClient;
  indexName: string;
  mappings: MappingTypeMapping;
  logger?: Logger;
}

export const createIndexWithMappings = async ({
  esClient,
  indexName,
  mappings,
  logger,
}: CreateIndexOptions): Promise<void> => {
  try {
    // Check if index already exists
    const indexExists = await esClient.indices.exists({
      index: indexName,
    });

    if (indexExists) {
      logger?.debug(`Index ${indexName} already exists`);
      return;
    }

    logger?.debug(`Creating index ${indexName} with mappings`);

    // Create the index with proper mappings.
    // `index.hidden: true` prevents the dot-prefixed name from emitting the
    // `index_name_starts_with_dot` deprecation warning after the ES system-index
    // carve-out (MetadataCreateIndexService.validateDotIndex skips the warning for
    // hidden indices), and keeps the index out of wildcard expansion by default.
    await esClient.indices.create({
      index: indexName,
      mappings,
      settings: { index: { hidden: true } },
    });

    logger?.debug(`Successfully created index ${indexName}`);
  } catch (error) {
    // If the index already exists, we can ignore the error
    if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
      logger?.debug(`Index ${indexName} already exists (created by another process)`);
      return;
    }

    logger?.error(`Failed to create index ${indexName}: ${error}`);
    throw error;
  }
};

export const createOrUpdateIndex = async ({
  esClient,
  indexName,
  mappings,
  logger,
}: CreateIndexOptions): Promise<void> => {
  try {
    const indexExists = await esClient.indices.exists({
      index: indexName,
    });

    if (!indexExists) {
      // Create new index
      await createIndexWithMappings({
        esClient,
        indexName,
        mappings,
        logger,
      });
    } else {
      // Index exists, update mappings and ensure the hidden setting is applied.
      // `index.hidden` is a dynamic setting so existing indices pick it up without a reindex.
      try {
        await esClient.indices.putMapping({
          index: indexName,
          ...mappings,
        });
        logger?.debug(`Updated mappings for existing index ${indexName}`);
      } catch (mappingError) {
        logger?.warn(`Failed to update mappings for index ${indexName}: ${mappingError.message}`);
        // Continue - the index exists and can be used
      }
      try {
        await esClient.indices.putSettings({
          index: indexName,
          settings: { index: { hidden: true } },
        });
        logger?.debug(`Applied hidden setting for existing index ${indexName}`);
      } catch (settingsError) {
        logger?.warn(`Failed to apply hidden setting for index ${indexName}: ${settingsError.message}`);
        // Continue - this setting is advisory; the index remains usable without it
      }
    }
  } catch (error) {
    logger?.error(`Failed to create or update index ${indexName}: ${error}`);
    throw error;
  }
};
