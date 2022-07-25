/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger, SavedObjectsServiceStart } from '@kbn/core/server';

const SAVED_OBJECT_ID = 'sample-data-telemetry';

export interface SampleDataUsageTracker {
  addInstall(dataSet: string): void;
  addUninstall(dataSet: string): void;
}

export function usage(
  savedObjects: Promise<SavedObjectsServiceStart>,
  logger: Logger
): SampleDataUsageTracker {
  const handleIncrementError = (err: Error) => {
    if (err && err.stack) {
      logger.debug(err.stack);
    }
    logger.warn(`saved objects repository incrementCounter encountered an error: ${err}`);
  };

  const internalRepositoryPromise = savedObjects.then((so) => so.createInternalRepository());

  return {
    addInstall: async (dataSet: string) => {
      try {
        const internalRepository = await internalRepositoryPromise;
        await internalRepository.incrementCounter(SAVED_OBJECT_ID, dataSet, [`installCount`]);
      } catch (err) {
        handleIncrementError(err);
      }
    },
    addUninstall: async (dataSet: string) => {
      try {
        const internalRepository = await internalRepositoryPromise;
        await internalRepository.incrementCounter(SAVED_OBJECT_ID, dataSet, [`unInstallCount`]);
      } catch (err) {
        handleIncrementError(err);
      }
    },
  };
}
