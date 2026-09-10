/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extend } from 'lodash';

const isSet = <T extends Record<string, any>>(def: T | undefined, key: string): def is T =>
  Object.keys(def ?? {}).includes(key);

export const omitUnsetKeys = <T>(
  defaults: Record<string, unknown>,
  def?: Record<string, unknown>
): T => {
  return extend<T>({}, defaults, def, (objValue: unknown, _: unknown, key: string) => {
    if (isSet(def, key) && objValue === undefined) {
      return undefined;
    }
    return objValue;
  });
};
