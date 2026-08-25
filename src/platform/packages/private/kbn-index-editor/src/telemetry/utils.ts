/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type BucketConfig = Array<{ to: number; label: string }>;

/**
 * Returns a bucket label for a given value based on a bucket configuration.
 * @param value The value to bucket.
 * @param config The bucket configuration. The last item in the config is used for values greater than the specified `to`.
 */
export const getBucket = (value: number, config: BucketConfig): string => {
  if (value === 0) {
    return '0';
  }

  for (const bucket of config) {
    if (value <= bucket.to) {
      return bucket.label;
    }
  }

  // For values greater than the last bucket's `to`, create an overflow label
  const lastBucket = config[config.length - 1];

  // If the label already ends with '+', use it as-is
  if (lastBucket.label.endsWith('+')) {
    return lastBucket.label;
  }

  // Otherwise, create a "X+" label from the last bucket's upper bound
  return `${lastBucket.to}+`;
};
