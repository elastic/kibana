/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once, debounce } from 'lodash';
import type { CoreSetup, Logger } from 'kibana/server';
import type { IEsSearchResponse } from '../../../common';

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

  // Instead of updating the search count every time a search completes, we update some in-memory
  // counts and only update the saved object every ~5 seconds
  let successCount = 0;
  let errorCount = 0;
  let totalDuration = 0;

  const updateSearchUsage = debounce(
    async () => {
      const repository = await getRepository();
      await repository.incrementCounter(SAVED_OBJECT_ID, SAVED_OBJECT_ID, [
        { fieldName: 'successCount', incrementBy: successCount },
        { fieldName: 'errorCount', incrementBy: errorCount },
        { fieldName: 'totalDuration', incrementBy: totalDuration },
      ]);
      successCount = errorCount = totalDuration = 0;
    },
    5000,
    { maxWait: 5000 }
  );

  const trackSuccess = (duration: number) => {
    successCount++;
    totalDuration += duration;
    return updateSearchUsage();
  };

  const trackError = async () => {
    errorCount++;
    return updateSearchUsage();
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
