/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { CoreSetup, Logger } from 'kibana/server';
import type { IEsSearchResponse } from '../../../common';
import type { Usage } from './register';

const SAVED_OBJECT_ID = 'search-telemetry';

export interface SearchUsage {
  trackError(): Promise<void>;
  trackSuccess(duration: number): Promise<void>;
}

export function usageProvider(core: CoreSetup): SearchUsage {
  const getTracker = (eventType: keyof Usage) => {
    return async (duration?: number) => {
      const repository = await core
        .getStartServices()
        .then(([coreStart]) => coreStart.savedObjects.createInternalRepository());

      let attributes: Usage;
      let doesSavedObjectExist: boolean = true;

      try {
        const response = await repository.get<Usage>(SAVED_OBJECT_ID, SAVED_OBJECT_ID);
        attributes = response.attributes;
      } catch (e) {
        doesSavedObjectExist = false;
        attributes = {
          successCount: 0,
          errorCount: 0,
          averageDuration: 0,
        };
      }

      attributes[eventType]++;

      // Only track the average duration for successful requests
      if (eventType === 'successCount') {
        attributes.averageDuration =
          ((duration ?? 0) + (attributes.averageDuration ?? 0)) / (attributes.successCount ?? 1);
      }

      try {
        if (doesSavedObjectExist) {
          await repository.update(SAVED_OBJECT_ID, SAVED_OBJECT_ID, attributes);
        } else {
          await repository.create(SAVED_OBJECT_ID, attributes, { id: SAVED_OBJECT_ID });
        }
      } catch (e) {
        // Version conflict error, swallow
      }
    };
  };

  return {
    trackError: () => getTracker('errorCount')(),
    trackSuccess: getTracker('successCount'),
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
