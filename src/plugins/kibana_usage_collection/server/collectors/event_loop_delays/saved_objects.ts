/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SavedObjectAttributes,
  SavedObjectsServiceSetup,
  ISavedObjectsRepository,
} from 'kibana/server';
import moment from 'moment';
import type { IntervalHistogram } from './event_loop_delays';

export const SAVED_OBJECTS_DAILY_TYPE = 'event_loop_delays_daily';

export interface EventLoopDelaysDaily extends SavedObjectAttributes, IntervalHistogram {
  processId: number;
}

export function registerSavedObjectTypes(registerType: SavedObjectsServiceSetup['registerType']) {
  registerType({
    name: SAVED_OBJECTS_DAILY_TYPE,
    hidden: true,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {
        // This type requires `lastUpdatedAt` to be indexed so we can use it when rolling up totals (lastUpdatedAt < now-90d)
        lastUpdatedAt: { type: 'date' },
      },
    },
  });
}

export function serializeSavedObjectId({ date, pid }: { date: moment.MomentInput; pid: number }) {
  const formattedDate = moment(date).format('DDMMYYYY');

  return `${pid}::${formattedDate}`;
}

export async function deleteHistogramSavedObjects(
  internalRepository: ISavedObjectsRepository,
  daysTimeRange = 3
) {
  const { saved_objects: savedObjects } = await internalRepository.find<EventLoopDelaysDaily>({
    type: SAVED_OBJECTS_DAILY_TYPE,
    filter: `${SAVED_OBJECTS_DAILY_TYPE}.attributes.lastUpdatedAt < "now-${daysTimeRange}d/d"`,
  });

  return await Promise.allSettled(
    savedObjects.map(async (savedObject) => {
      return await internalRepository.delete(SAVED_OBJECTS_DAILY_TYPE, savedObject.id);
    })
  );
}

export async function storeHistogram(
  histogram: IntervalHistogram,
  internalRepository: ISavedObjectsRepository
) {
  const pid = process.pid;
  const id = serializeSavedObjectId({ date: histogram.lastUpdatedAt, pid });

  return await internalRepository.create<EventLoopDelaysDaily>(
    SAVED_OBJECTS_DAILY_TYPE,
    { ...histogram, processId: pid },
    { id, overwrite: true }
  );
}
