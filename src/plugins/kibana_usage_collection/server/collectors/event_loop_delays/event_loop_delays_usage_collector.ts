/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { timer } from 'rxjs';
import { SavedObjectsServiceSetup, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { rollDailyData } from './rollups';
import { registerSavedObjectTypes, EventLoopDelaysDaily } from './saved_objects';
import { eventLoopDelaysUsageSchema, EventLoopDelaysUsageReport } from './schema';
import { SAVED_OBJECTS_DAILY_TYPE } from './saved_objects';
import { ROLL_DAILY_INDICES_INTERVAL, ROLL_INDICES_START } from './constants';

export function registerEventLoopDelaysCollector(
  logger: Logger,
  usageCollection: UsageCollectionSetup,
  registerType: SavedObjectsServiceSetup['registerType'],
  getSavedObjectsClient: () => ISavedObjectsRepository | undefined
) {
  registerSavedObjectTypes(registerType);

  timer(ROLL_INDICES_START, ROLL_DAILY_INDICES_INTERVAL).subscribe(() =>
    rollDailyData(logger, getSavedObjectsClient())
  );

  const collector = usageCollection.makeUsageCollector<EventLoopDelaysUsageReport>({
    type: 'event_loop_delays',
    isReady: () => typeof getSavedObjectsClient() !== 'undefined',
    schema: eventLoopDelaysUsageSchema,
    fetch: async () => {
      const internalRepository = getSavedObjectsClient();
      if (!internalRepository) {
        return { daily: [] };
      }

      const { saved_objects: savedObjects } = await internalRepository.find<EventLoopDelaysDaily>({
        type: SAVED_OBJECTS_DAILY_TYPE,
        sortField: 'updated_at',
        sortOrder: 'desc',
      });

      return {
        daily: savedObjects.map((savedObject) => savedObject.attributes),
      };
    },
  });

  usageCollection.registerCollector(collector);
}
