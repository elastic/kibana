/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectsRepository } from '@kbn/core/server';

import { viewsCountRangeFields, VIEWS_TOTAL_FIELD } from '../../common';

export const incrementViewsCounters = (
  contentType: string,
  savedObjectId: string,
  repository: ISavedObjectsRepository,
  // Temp, just for the POC demo
  incrementOnlyTotalCounter: boolean = false
) => {
  repository.incrementCounter(contentType, savedObjectId, [
    VIEWS_TOTAL_FIELD,
    ...(incrementOnlyTotalCounter ? [] : viewsCountRangeFields),
  ]);
};
