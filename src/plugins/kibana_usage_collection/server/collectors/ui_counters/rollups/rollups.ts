/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectsRepository, Logger } from 'kibana/server';
import moment from 'moment';
import type { Subject } from 'rxjs';

import { UI_COUNTERS_KEEP_DOCS_FOR_DAYS } from './constants';
import {
  UICounterSavedObject,
  UI_COUNTER_SAVED_OBJECT_TYPE,
} from '../ui_counter_saved_object_type';

export function isSavedObjectOlderThan({
  numberOfDays,
  startDate,
  doc,
}: {
  numberOfDays: number;
  startDate: moment.Moment | string | number;
  doc: Pick<UICounterSavedObject, 'updated_at'>;
}): boolean {
  const { updated_at: updatedAt } = doc;
  const today = moment(startDate).startOf('day');
  const updateDay = moment(updatedAt).startOf('day');

  const diffInDays = today.diff(updateDay, 'days');
  if (diffInDays > numberOfDays) {
    return true;
  }

  return false;
}

export async function rollUiCounterIndices(
  logger: Logger,
  stopUsingUiCounterIndicies$: Subject<void>,
  savedObjectsClient?: ISavedObjectsRepository
) {
  if (!savedObjectsClient) {
    return;
  }

  const now = moment();

  try {
    const { saved_objects: rawUiCounterDocs } = await savedObjectsClient.find<UICounterSavedObject>(
      {
        type: UI_COUNTER_SAVED_OBJECT_TYPE,
        perPage: 1000, // Process 1000 at a time as a compromise of speed and overload
      }
    );

    if (rawUiCounterDocs.length === 0) {
      /**
       * @deprecated 7.13 to be removed in 8.0.0
       * Stop triggering rollups when we've rolled up all documents.
       *
       * This Saved Object registry is no longer used.
       * Migration from one SO registry to another is not yet supported.
       * In a future release we can remove this piece of code and
       * migrate any docs to the Usage Counters Saved object.
       *
       * @removeBy 8.0.0
       */

      stopUsingUiCounterIndicies$.complete();
    }

    const docsToDelete = rawUiCounterDocs.filter((doc) =>
      isSavedObjectOlderThan({
        numberOfDays: UI_COUNTERS_KEEP_DOCS_FOR_DAYS,
        startDate: now,
        doc,
      })
    );

    return await Promise.all(
      docsToDelete.map(({ id }) => savedObjectsClient.delete(UI_COUNTER_SAVED_OBJECT_TYPE, id))
    );
  } catch (err) {
    logger.warn(`Failed to rollup UI Counters saved objects.`);
    logger.warn(err);
  }
}
