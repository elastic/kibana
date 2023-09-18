/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isPlainObject } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

export const mergeForUpdate = (
  targetAttributes: Record<string, any>,
  updatedAttributes: any
): Record<string, any> => {
  return recursiveMerge(targetAttributes, updatedAttributes, []);
};

const recursiveMerge = (target: Record<string, any>, value: any, keys: string[] = []) => {
  if (isPlainObject(value) && Object.keys(value).length > 0) {
    for (const [subKey, subVal] of Object.entries(value)) {
      recursiveMerge(target, subVal, [...keys, subKey]);
    }
  } else if (keys.length > 0 && value !== undefined) {
    set(target, keys, value);
  }

  return target;
};
