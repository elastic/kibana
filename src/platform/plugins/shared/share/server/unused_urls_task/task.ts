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
import { ISavedObjectsRepository } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { TaskInstanceWithId } from '@kbn/task-manager-plugin/server/task';
import { MAX_PAGE_SIZE, SAVED_OBJECT_TYPE, TASK_ID } from './constants';

export const getDeleteUnsuedUrlTask = (interval: string): TaskInstanceWithId => ({
  id: TASK_ID,
  taskType: TASK_ID,
  params: {},
  state: {},
  schedule: {
    interval,
  },
});

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
  pitKeepAlive,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  filter: string;
  logger: Logger;
  pitKeepAlive: string;
}) => {
  const results: Array<{ id: string }> = [];

  const { id: pitId } = await savedObjectsRepository.openPointInTimeForType(SAVED_OBJECT_TYPE, {
    keepAlive: pitKeepAlive,
  });

  try {
    let searchAfter: SortResults | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await savedObjectsRepository.find({
        type: SAVED_OBJECT_TYPE,
        filter,
        pit: { id: pitId, keepAlive: pitKeepAlive },
        searchAfter,
        perPage: MAX_PAGE_SIZE,
      });

      results.push(...response.saved_objects.map(({ id }) => ({ id })));
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
  pitKeepAlive,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  filter: string;
  logger: Logger;
  pitKeepAlive: string;
}) => {
  // TODO: Check if it should run in trycatch
  try {
    logger.info('Unused URLs cleanup started');

    const unusedUrls = await fetchAllUnusedUrls({
      savedObjectsRepository,
      filter,
      logger,
      pitKeepAlive,
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
