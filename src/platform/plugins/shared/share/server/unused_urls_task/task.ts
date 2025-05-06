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
import { MAX_PAGE_SIZE, SAVED_OBJECT_TYPE, TASK_ID } from './constants';

export const getDeleteUnusedUrlTaskInstance = (interval: string): TaskInstanceWithId => ({
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
  namespace,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  unusedUrls: SavedObjectsBulkDeleteObject[];
  logger: Logger;
  namespace: string;
}) => {
  logger.info(`Deleting ${unusedUrls.length} unused URL(s) in namespace: ${namespace}`);

  try {
    await savedObjectsRepository.bulkDelete(unusedUrls, {
      refresh: 'wait_for',
      namespace,
    });

    logger.info(
      `Succesfully deleted ${unusedUrls.length} unused URL(s) in namespace: ${namespace}`
    );
  } catch (e) {
    logger.error(`Failed to delete unused URL(s): ${e.message}`);
  }
};

type SavedObjectsBulkDeleteObjectWithNamespace = SavedObjectsBulkDeleteObject & {
  namespace: string;
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
        perPage: MAX_PAGE_SIZE,
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
      hasMore = savedObjects.length === MAX_PAGE_SIZE;

      if (hasMore) {
        searchAfter = savedObjects[savedObjects.length - 1].sort;
      }
    }
  } catch (e) {
    logger.error(`Failed to fetch unused URLs: ${e.message}`);
  } finally {
    await savedObjectsRepository.closePointInTime(pitId);
  }

  return groupBy(results, 'namespace');
};

export const runDeleteUnusedUrlsTask = async ({
  core,
  urlExpirationDuration,
  logger,
  pitKeepAlive,
}: {
  core: CoreSetup;
  urlExpirationDuration: string;
  logger: Logger;
  pitKeepAlive: string;
}) => {
  try {
    logger.info('Unused URLs cleanup started');
    const [coreStart] = await core.getStartServices();

    const savedObjectsRepository = coreStart.savedObjects.createInternalRepository();

    const filter = `url.attributes.accessDate <= now-${urlExpirationDuration}`;

    const unusedUrlsGroupedByNamespace = await fetchAllUnusedUrls({
      savedObjectsRepository,
      filter,
      logger,
      pitKeepAlive,
    });

    if (Object.keys(unusedUrlsGroupedByNamespace).length) {
      const deletionPromises = Object.entries(unusedUrlsGroupedByNamespace).map(
        async ([namespace, unusedUrls]) => {
          logger.info(`Found ${unusedUrls.length} unused URL(s) in namespace: ${namespace}`);
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
      logger.info('No unused URLs found');
    }
  } catch (e) {
    logger.error(`Failed to run: ${e.message}`);
  }
};
