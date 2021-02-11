/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
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

  return {
    trackSuccess: async (duration: number) => {
      const repository = await getRepository();
      await repository.incrementCounter(SAVED_OBJECT_ID, SAVED_OBJECT_ID, [
        { fieldName: 'successCount' },
        {
          fieldName: 'totalDuration',
          incrementBy: duration,
        },
      ]);
    },
    trackError: async () => {
      const repository = await getRepository();
      await repository.incrementCounter(SAVED_OBJECT_ID, SAVED_OBJECT_ID, [
        { fieldName: 'errorCount' },
      ]);
    },
  };
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
