/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
import type { CoreSetup, Logger } from 'kibana/server';
import { SavedObjectsErrorHelpers } from '../../../../../core/server';
import type { IEsSearchResponse } from '../../../common';

const SAVED_OBJECT_ID = 'search-telemetry';
const MAX_RETRY_COUNT = 3;

export interface SearchUsage {
  trackError(): Promise<void>;
  trackSuccess(duration: number): Promise<void>;
}

export function usageProvider(core: CoreSetup): SearchUsage {
  const getRepository = once(async () => {
    const [coreStart] = await core.getStartServices();
    return coreStart.savedObjects.createInternalRepository();
  });

  const trackSuccess = async (duration: number, retryCount = 0) => {
    const repository = await getRepository();
    try {
      await repository.incrementCounter(SAVED_OBJECT_ID, SAVED_OBJECT_ID, [
        { fieldName: 'successCount' },
        {
          fieldName: 'totalDuration',
          incrementBy: duration,
        },
      ]);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e) && retryCount < MAX_RETRY_COUNT) {
        setTimeout(() => trackSuccess(duration, retryCount + 1), 1000);
      }
    }
  };

  const trackError = async (retryCount = 0) => {
    const repository = await getRepository();
    try {
      await repository.incrementCounter(SAVED_OBJECT_ID, SAVED_OBJECT_ID, [
        { fieldName: 'errorCount' },
      ]);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e) && retryCount < MAX_RETRY_COUNT) {
        setTimeout(() => trackError(retryCount + 1), 1000);
      }
    }
  };

  return { trackSuccess, trackError };
}

/**
 * Rxjs observer for easily doing `tap(searchUsageObserver(logger, usage))` in an rxjs chain.
 */
export function searchUsageObserver(logger: Logger, usage?: SearchUsage) {
  return {
    next(response: IEsSearchResponse) {
      logger.debug(`trackSearchStatus:next  ${response.rawResponse.took}`);
      usage?.trackSuccess(response.rawResponse.took);
    },
    error() {
      logger.debug(`trackSearchStatus:error`);
      usage?.trackError();
    },
  };
}
