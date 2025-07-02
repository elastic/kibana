/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Duration } from 'moment';
import { CoreSetup, ISavedObjectsRepository, SavedObjectsBulkDeleteObject } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { TaskInstanceWithId } from '@kbn/task-manager-plugin/server/task';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
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

export const fetchUnusedUrlsFromFirstNamespace = async ({
  savedObjectsRepository,
  urlExpirationDuration,
  urlLimit,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  urlExpirationDuration: Duration;
  urlLimit: number;
}) => {
  const filter = `url.attributes.accessDate <= now-${durationToSeconds(urlExpirationDuration)}`;

  const {
    saved_objects: savedObjects,
    total,
    per_page: perPage,
    page,
  } = await savedObjectsRepository.find({
    type: SAVED_OBJECT_TYPE,
    filter,
    perPage: urlLimit,
    namespaces: ['*'],
    fields: ['type'],
  });

  const firstNamespace = SavedObjectsUtils.namespaceIdToString(savedObjects[0]?.namespaces?.[0]);

  const savedObjectsByNamespace = savedObjects.filter(
    (so) => so.namespaces?.length && so.namespaces.includes(firstNamespace)
  );

  const unusedUrls = savedObjectsByNamespace.map((so) => ({
    id: so.id,
    type: so.type,
  }));

  return {
    unusedUrls,
    hasMore: page * perPage < total,
    namespace: firstNamespace,
  };
};

export const runDeleteUnusedUrlsTask = async ({
  core,
  urlExpirationDuration,
  urlLimit,
  logger,
  isEnabled,
}: {
  core: CoreSetup;
  urlExpirationDuration: Duration;
  urlLimit: number;
  logger: Logger;
  isEnabled: boolean;
}) => {
  if (!isEnabled) {
    logger.debug('Unused URLs cleanup task is disabled, skipping execution');
    return { deletedCount: 0 };
  }

  logger.debug('Unused URLs cleanup started');

  const [coreStart] = await core.getStartServices();

  const savedObjectsRepository = coreStart.savedObjects.createInternalRepository();

  let deletedCount = 0;

  let { unusedUrls, hasMore, namespace } = await fetchUnusedUrlsFromFirstNamespace({
    savedObjectsRepository,
    urlExpirationDuration,
    urlLimit,
  });

  while (unusedUrls.length > 0 && deletedCount < urlLimit) {
    await deleteUnusedUrls({
      savedObjectsRepository,
      unusedUrls,
      logger,
      namespace,
    });

    deletedCount += unusedUrls.length;

    if (hasMore && deletedCount < urlLimit) {
      const nextPage = await fetchUnusedUrlsFromFirstNamespace({
        savedObjectsRepository,
        urlExpirationDuration,
        urlLimit: urlLimit - deletedCount,
      });

      unusedUrls = nextPage.unusedUrls;
      hasMore = nextPage.hasMore;
      namespace = nextPage.namespace;
    } else {
      break;
    }
  }

  logger.debug('Unused URLs cleanup finished');

  return { deletedCount };
};

export const scheduleUnusedUrlsCleanupTask = async ({
  taskManager,
  checkInterval,
  isEnabled,
}: {
  taskManager: TaskManagerStartContract;
  checkInterval: Duration;
  isEnabled: boolean;
}) => {
  try {
    if (!isEnabled) {
      await taskManager.removeIfExists(TASK_ID);
      return;
    }

    const taskInstance = getDeleteUnusedUrlTaskInstance(checkInterval);
    await taskManager.ensureScheduled(taskInstance);
  } catch (e) {
    throw new Error(e.message || 'Failed to schedule unused URLs cleanup task');
  }
};
