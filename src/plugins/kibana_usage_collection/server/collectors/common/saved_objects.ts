/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { SavedObject } from '@kbn/core-saved-objects-api-server';

export function isSavedObjectOlderThan({
  numberOfDays,
  startDate,
  doc,
}: {
  numberOfDays: number;
  startDate: moment.Moment | string | number;
  doc: Pick<SavedObject, 'updated_at'>;
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
