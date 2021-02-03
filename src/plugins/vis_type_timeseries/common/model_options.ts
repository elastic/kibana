/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export enum MODEL_TYPES {
  UNWEIGHTED = 'simple',
  WEIGHTED_EXPONENTIAL = 'ewma',
  WEIGHTED_EXPONENTIAL_DOUBLE = 'holt',
  WEIGHTED_EXPONENTIAL_TRIPLE = 'holt_winters',
  WEIGHTED_LINEAR = 'linear',
}
