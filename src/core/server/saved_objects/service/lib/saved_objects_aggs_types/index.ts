/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import * as rt from 'io-ts';

import { bucketAggsType } from './bucket_aggs';
import { metricsAggsType } from './metrics_aggs';

import { SavedObjectsErrorHelpers } from '../errors';
import { throwErrors } from './helpers';

export const savedObjectsAggs = {
  ...metricsAggsType,
  ...bucketAggsType,
};

export const validateSavedObjectsTypeAggs = (rtType: rt.Any, aggObject: unknown) => {
  pipe(
    rtType.decode(aggObject),
    fold(throwErrors(SavedObjectsErrorHelpers.createBadRequestError), identity)
  );
};
