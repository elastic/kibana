/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isObject } from 'lodash';
import { SavedObjectsErrorHelpers, type SavedObject } from '@kbn/core-saved-objects-server';
import {
  SavedObjectsIncrementCounterField,
  SavedObjectsIncrementCounterOptions,
} from '@kbn/core-saved-objects-api-server';
import { ApiExecutionContext } from './types';
import { incrementCounterInternal } from './internals';

export interface PerformIncrementCounterParams<T = unknown> {
  type: string;
  id: string;
  counterFields: Array<string | SavedObjectsIncrementCounterField>;
  options: SavedObjectsIncrementCounterOptions<T>;
}

export const performIncrementCounter = async <T>(
  { type, id, counterFields, options }: PerformIncrementCounterParams<T>,
  apiExecutionContext: ApiExecutionContext
): Promise<SavedObject<T>> => {
  const { allowedTypes } = apiExecutionContext;
  // This is not exposed on the SOC, there are no authorization or audit logging checks
  if (typeof type !== 'string') {
    throw new Error('"type" argument must be a string');
  }

  const isArrayOfCounterFields =
    Array.isArray(counterFields) &&
    counterFields.every(
      (field) =>
        typeof field === 'string' || (isObject(field) && typeof field.fieldName === 'string')
    );

  if (!isArrayOfCounterFields) {
    throw new Error(
      '"counterFields" argument must be of type Array<string | { incrementBy?: number; fieldName: string }>'
    );
  }
  if (!allowedTypes.includes(type)) {
    throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
  }

  return incrementCounterInternal<T>({ type, id, counterFields, options }, apiExecutionContext);
};
