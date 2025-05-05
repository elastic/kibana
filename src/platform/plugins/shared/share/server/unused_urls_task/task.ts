/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { ISavedObjectsRepository, SavedObjectsFindResult } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { MAX_PAGE_SIZE, PIT_KEEP_ALIVE, SAVED_OBJECT_TYPE } from './constants';

export const deleteUnusedUrls = async ({
  savedObjectsRepository,
  unusedUrls,
  logger,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  unusedUrls: Array<{ id: string; type: string }>;
  logger: Logger;
}) => {
  const total = unusedUrls.length;
  logger.info(`Deleting ${total} unused URL(s)`);

  try {
    await savedObjectsRepository.bulkDelete(unusedUrls, {
      refresh: 'wait_for',
    });

    logger.info(`Succesfully deleted ${total} unused URL(s)`);
  } catch (e) {
    logger.error(`Failed to delete unused URL(s): ${e.message}`);
  }
};

export const fetchAllUnusedUrls = async ({
  savedObjectsRepository,
  filter,
  logger,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  filter: string;
  logger: Logger;
}) => {
  const results: SavedObjectsFindResult[] = [];

  const { id: pitId } = await savedObjectsRepository.openPointInTimeForType(SAVED_OBJECT_TYPE, {
    keepAlive: PIT_KEEP_ALIVE,
  });

  try {
    let searchAfter: SortResults | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await savedObjectsRepository.find({
        type: SAVED_OBJECT_TYPE,
        filter,
        pit: { id: pitId, keepAlive: PIT_KEEP_ALIVE },
        searchAfter,
        perPage: MAX_PAGE_SIZE,
      });

      results.push(...response.saved_objects);
      hasMore = response.saved_objects.length === MAX_PAGE_SIZE;

      if (hasMore) {
        searchAfter = response.saved_objects[response.saved_objects.length - 1].sort;
      }
    }
  } catch (e) {
    logger.error(`Failed to fetch unused URLs: ${e.message}`);
  } finally {
    await savedObjectsRepository.closePointInTime(pitId);
  }

  return results.map(({ id }) => ({
    id,
    type: SAVED_OBJECT_TYPE,
  }));
};

export const runDeleteUnusedUrlsTask = async ({
  savedObjectsRepository,
  filter,
  logger,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  filter: string;
  logger: Logger;
}) => {
  try {
    logger.info('Unused URLs cleanup started');

    const unusedUrls = await fetchAllUnusedUrls({
      savedObjectsRepository,
      filter,
      logger,
    });

    logger.info(`Found ${unusedUrls.length} unused URL(s)`);

    if (unusedUrls.length > 0) {
      await deleteUnusedUrls({
        savedObjectsRepository,
        unusedUrls,
        logger,
      });
    }
  } catch (e) {
    logger.error(`Failed to run: ${e.message}`);
  }
};
