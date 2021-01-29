/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Convert an object type into an object with the same keys
 * but with each value type replaced with `unknown`
 */
export type UnknownVals<T extends object> = {
  [k in keyof T]: unknown;
};
