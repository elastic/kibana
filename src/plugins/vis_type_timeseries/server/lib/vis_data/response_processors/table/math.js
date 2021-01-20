/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mathAgg } from '../series/math';

export function math(bucket, panel, series) {
  return (next) => (results) => {
    const mathFn = mathAgg({ aggregations: bucket }, panel, series);
    return mathFn(next)(results);
  };
}
