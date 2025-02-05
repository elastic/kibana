/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import set from 'set-value';

/**
 * Set path in obj. Behaves like lodash `set`
 * @param obj The object to mutate
 * @param path The path of the sub-property to set
 * @param val The value to set the sub-property to
 */
export function overwrite(obj: Record<string, unknown>, path: string, val: unknown) {
  set(obj, path, undefined);
  set(obj, path, val);
}
