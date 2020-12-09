/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ISavedObjectsRepository, Logger } from 'kibana/server';
import moment from 'moment';

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
