"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.usage = usage;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const SAVED_OBJECT_ID = 'sample-data-telemetry';

function usage(savedObjects, logger) {
  const handleIncrementError = err => {
    if (err && err.stack) {
      logger.debug(err.stack);
    }

    logger.warn(`saved objects repository incrementCounter encountered an error: ${err}`);
  };

  const internalRepositoryPromise = savedObjects.then(so => so.createInternalRepository());
  return {
    addInstall: async dataSet => {
      try {
        const internalRepository = await internalRepositoryPromise;
        await internalRepository.incrementCounter(SAVED_OBJECT_ID, dataSet, [`installCount`]);
      } catch (err) {
        handleIncrementError(err);
      }
    },
    addUninstall: async dataSet => {
      try {
        const internalRepository = await internalRepositoryPromise;
        await internalRepository.incrementCounter(SAVED_OBJECT_ID, dataSet, [`unInstallCount`]);
      } catch (err) {
        handleIncrementError(err);
      }
    }
  };
}