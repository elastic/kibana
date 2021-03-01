/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Thresholds for indicating the impact of multi-bucket features in an anomaly.
 * As a rule-of-thumb, a threshold value T corresponds to the multi-bucket probability
 * being 1000^(T/5) times smaller than the single bucket probability.
 * So, for example, for HIGH it is 63 times smaller.
 */
export const MULTI_BUCKET_IMPACT = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: -5,
};
