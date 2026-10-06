/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Duration } from 'moment';
import type {
  CoreSetup,
  ISavedObjectsRepository,
  SavedObjectsBulkDeleteObject,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { TaskInstanceWithId } from '@kbn/task-manager-plugin/server/task';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare const durationToSeconds: (duration: Duration) => string;
export declare const getDeleteUnusedUrlTaskInstance: (interval: Duration) => TaskInstanceWithId;
export declare const deleteUnusedUrls: ({
  savedObjectsRepository,
  unusedUrls,
  namespace,
  logger,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  unusedUrls: SavedObjectsBulkDeleteObject[];
  namespace: string;
  logger: Logger;
}) => Promise<void>;
export declare const fetchUnusedUrlsFromFirstNamespace: ({
  savedObjectsRepository,
  urlExpirationDuration,
  urlLimit,
}: {
  savedObjectsRepository: ISavedObjectsRepository;
  urlExpirationDuration: Duration;
  urlLimit: number;
}) => Promise<{
  unusedUrls: {
    id: string;
    type: string;
  }[];
  hasMore: boolean;
  namespace: string;
}>;
export declare const runDeleteUnusedUrlsTask: ({
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
}) => Promise<{
  deletedCount: number;
}>;
export declare const scheduleUnusedUrlsCleanupTask: ({
  taskManager,
  checkInterval,
  isEnabled,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  checkInterval: Duration;
  isEnabled: boolean;
  logger: Logger;
}) => Promise<void>;
