/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once, debounce } from 'lodash';
import type { CoreSetup, Logger } from 'kibana/server';
import type { IEsSearchResponse, ISearchOptions } from '../../../common';
import { isCompleteResponse } from '../../../common';
import { CollectedUsage } from './register';

const SAVED_OBJECT_ID = 'search-telemetry';

export interface SearchUsage {
  trackError(): Promise<void>;
  trackSuccess(duration: number): Promise<void>;
}

export function usageProvider(core: CoreSetup): SearchUsage {
  const getRepository = once(async () => {
    const [coreStart] = await core.getStartServices();
    return coreStart.savedObjects.createInternalRepository();
  });

  const collectedUsage: CollectedUsage = {
    successCount: 0,
    errorCount: 0,
    totalDuration: 0,
  };

  // Instead of updating the search count every time a search completes, we update some in-memory
  // counts and only update the saved object every ~5 seconds
  const updateSearchUsage = debounce(
    async () => {
      const repository = await getRepository();
      const { successCount, errorCount, totalDuration } = collectedUsage;
      const counterFields = Object.entries(collectedUsage)
        .map(([fieldName, incrementBy]) => ({ fieldName, incrementBy }))
        // Filter out any zero values because `incrementCounter` will still increment them
        .filter(({ incrementBy }) => incrementBy > 0);

      try {
        await repository.incrementCounter<CollectedUsage>(
          SAVED_OBJECT_ID,
          SAVED_OBJECT_ID,
          counterFields
        );

        // Since search requests may have completed while the saved object was being updated, we minus
        // what was just updated in the saved object rather than resetting the values to 0
        collectedUsage.successCount -= successCount;
        collectedUsage.errorCount -= errorCount;
        collectedUsage.totalDuration -= totalDuration;
      } catch (e) {
        // We didn't reset the counters so we'll retry when the next search request completes
      }
    },
    5000,
    { maxWait: 5000 }
  );

  const trackSuccess = async (duration: number) => {
    collectedUsage.successCount++;
    collectedUsage.totalDuration += duration;
    return await updateSearchUsage();
  };

  const trackError = async () => {
    collectedUsage.errorCount++;
    return await updateSearchUsage();
  };

  return { trackSuccess, trackError };
}

/**
 * Rxjs observer for easily doing `tap(searchUsageObserver(logger, usage))` in an rxjs chain.
 */
export function searchUsageObserver(
  logger: Logger,
  usage?: SearchUsage,
  { isRestore }: ISearchOptions = {}
) {
  return {
    next(response: IEsSearchResponse) {
      if (isRestore || !isCompleteResponse(response)) return;
      logger.debug(`trackSearchStatus:next  ${response.rawResponse.took}`);
      usage?.trackSuccess(response.rawResponse.took);
    },
    error() {
      logger.debug(`trackSearchStatus:error`);
      usage?.trackError();
    },
  };
}
