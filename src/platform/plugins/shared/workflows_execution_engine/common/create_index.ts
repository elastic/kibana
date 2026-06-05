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

interface SetupRolloverIndexOptions {
  esClient: ElasticsearchClient;
  aliasName: string;
  indexPattern: string;
  initialIndex: string;
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

    // Create the index with proper mappings
    await esClient.indices.create({
      index: indexName,
      mappings,
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
      // Index exists, check if we need to update mappings
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
    }
  } catch (error) {
    logger?.error(`Failed to create or update index ${indexName}: ${error}`);
    throw error;
  }
};

/**
 * Registers an index template (index pattern + mappings) and bootstraps the
 * initial write index if the alias does not already exist.
 *
 * After setup:
 * - New indexes matching `indexPattern` receive `mappings` from the template
 * - `aliasName` points to one or more backing indexes (e.g. -000001, -000002, …)
 * - The latest backing index is the write index
 * - Reads via `aliasName` fan out across all backing indexes
 */
export const setupRolloverIndex = async ({
  esClient,
  aliasName,
  indexPattern,
  initialIndex,
  mappings,
  logger,
}: SetupRolloverIndexOptions): Promise<void> => {
  await ensureIndexTemplate({
    esClient,
    aliasName,
    indexPattern,
    mappings,
    logger,
  });
  await bootstrapWriteIndex({ esClient, aliasName, initialIndex, mappings, logger });
};

const ensureIndexTemplate = async ({
  esClient,
  aliasName,
  indexPattern,
  mappings,
  logger,
}: {
  esClient: ElasticsearchClient;
  aliasName: string;
  indexPattern: string;
  mappings: MappingTypeMapping;
  logger?: Logger;
}): Promise<void> => {
  try {
    await esClient.indices.putIndexTemplate({
      name: aliasName,
      index_patterns: [indexPattern],
      template: {
        mappings,
      },
    });
    logger?.debug(`Index template ${aliasName} created/updated`);
  } catch (error) {
    logger?.error(`Failed to create index template ${aliasName}: ${error}`);
    throw error;
  }
};

const bootstrapWriteIndex = async ({
  esClient,
  aliasName,
  initialIndex,
  mappings,
  logger,
}: {
  esClient: ElasticsearchClient;
  aliasName: string;
  initialIndex: string;
  mappings: MappingTypeMapping;
  logger?: Logger;
}): Promise<void> => {
  try {
    const aliasExists = await esClient.indices.existsAlias({ name: aliasName });
    if (aliasExists) {
      logger?.debug(`Alias ${aliasName} already exists, skipping bootstrap`);
      return;
    }

    await esClient.indices.create({
      index: initialIndex,
      aliases: {
        [aliasName]: { is_write_index: true },
      },
      mappings,
    });
    logger?.debug(`Bootstrapped write index ${initialIndex} with alias ${aliasName}`);
  } catch (error) {
    if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
      logger?.debug(`Write index ${initialIndex} already exists (created by another process)`);
      return;
    }
    logger?.error(`Failed to bootstrap write index ${initialIndex}: ${error}`);
    throw error;
  }
};
