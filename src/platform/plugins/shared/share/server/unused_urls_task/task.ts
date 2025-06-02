/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { CoreSetup, ISavedObjectsRepository, SavedObjectsBulkDeleteObject } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { TaskInstanceWithId } from '@kbn/task-manager-plugin/server/task';
import { groupBy } from 'lodash';
import { Duration } from 'moment';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { SAVED_OBJECT_TYPE, TASK_ID } from './constants';

export const durationToSeconds = (duration: Duration) => `${duration.asSeconds()}s`;

export const getDeleteUnusedUrlTaskInstance = (interval: Duration): TaskInstanceWithId => ({
  id: TASK_ID,
  taskType: TASK_ID,
  params: {},
  state: {},
  schedule: {
    interval: durationToSeconds(interval),
  },
  scope: ['share'],
});

export const deleteUnusedUrls = async ({
  savedObjectsRepository,
  unusedUrls,
  namespace,
  logger,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  unusedUrls: SavedObjectsBulkDeleteObject[];
  namespace: string;
  logger: Logger;
}) => {
  try {
    logger.debug(`Deleting ${unusedUrls.length} unused URL(s) in namespace "${namespace}"`);

    await savedObjectsRepository.bulkDelete(unusedUrls, {
      refresh: 'wait_for',
      namespace,
    });

    logger.debug(
      `Succesfully deleted ${unusedUrls.length} unused URL(s) in namespace "${namespace}"`
    );
  } catch (e) {
    throw new Error(`Failed to delete unused URL(s) in namespace "${namespace}": ${e.message}`);
  }
};

type SavedObjectsBulkDeleteObjectWithNamespace = SavedObjectsBulkDeleteObject & {
  namespace: string;
};

export const fetchAllUnusedUrls = async ({
  savedObjectsRepository,
  filter,
  pitKeepAlive,
  maxPageSize,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  filter: string;
  pitKeepAlive: string;
  maxPageSize: number;
}) => {
  const results: SavedObjectsBulkDeleteObjectWithNamespace[] = [];

  const { id: pitId } = await savedObjectsRepository.openPointInTimeForType(SAVED_OBJECT_TYPE, {
    keepAlive: pitKeepAlive,
  });

  try {
    let searchAfter: SortResults | undefined;
    let hasMore = true;

    while (hasMore) {
      const { saved_objects: savedObjects } = await savedObjectsRepository.find({
        type: SAVED_OBJECT_TYPE,
        filter,
        pit: { id: pitId, keepAlive: pitKeepAlive },
        searchAfter,
        perPage: maxPageSize,
        namespaces: ['*'],
        fields: ['type'],
      });

      results.push(
        ...savedObjects.map(({ id, type, namespaces }) => ({
          id,
          type,
          namespace: namespaces ? namespaces[0] : 'default',
        }))
      );
      hasMore = savedObjects.length === maxPageSize;

      if (hasMore) {
        searchAfter = savedObjects[savedObjects.length - 1].sort;
      }
    }
  } catch (e) {
    throw new Error(`Failed to fetch unused URLs: ${e.message}`);
  } finally {
    await savedObjectsRepository.closePointInTime(pitId);
  }

  return groupBy(results, 'namespace');
};

export const runDeleteUnusedUrlsTask = async ({
  core,
  urlExpirationDuration,
  pitKeepAlive,
  maxPageSize,
  logger,
}: {
  core: CoreSetup;
  urlExpirationDuration: Duration;
  pitKeepAlive: Duration;
  maxPageSize: number;
  logger: Logger;
}) => {
  logger.debug('Unused URLs cleanup started');

  const [coreStart] = await core.getStartServices();

  const savedObjectsRepository = coreStart.savedObjects.createInternalRepository();

  const filter = `url.attributes.accessDate <= now-${durationToSeconds(urlExpirationDuration)}`;

  const unusedUrlsGroupedByNamespace = await fetchAllUnusedUrls({
    savedObjectsRepository,
    filter,
    pitKeepAlive: durationToSeconds(pitKeepAlive),
    maxPageSize,
  });

  if (Object.keys(unusedUrlsGroupedByNamespace).length) {
    const deletionPromises = Object.entries(unusedUrlsGroupedByNamespace).map(
      async ([namespace, unusedUrls]) => {
        logger.debug(`Found ${unusedUrls.length} unused URL(s) in namespace "${namespace}"`);

        await deleteUnusedUrls({
          savedObjectsRepository,
          unusedUrls,
          logger,
          namespace,
        });
      }
    );

    await Promise.all(deletionPromises);
  } else {
    logger.debug('No unused URLs found');
  }
};

export const scheduleUnusedUrlsCleanupTask = async ({
  taskManager,
  checkInterval,
}: {
  taskManager: TaskManagerStartContract;
  checkInterval: Duration;
}) => {
  try {
    const taskInstance = getDeleteUnusedUrlTaskInstance(checkInterval);
    await taskManager.ensureScheduled(taskInstance);
  } catch (e) {
    throw new Error(e.message || 'Failed to schedule unused URLs cleanup task');
  }
};
