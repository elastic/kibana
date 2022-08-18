/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// For percentile, the aggregation id is coming in the form %s.%d, where %s is agg_id and %d - percents
export const getSafeId = (columnId?: number | string | null) => {
  const id = String(columnId);
  // only multi-value aggs like percentiles are allowed to contain dots and [
  const isMultiValueId = id.includes('[') || id.includes('.');
  if (!isMultiValueId) {
    return id;
  }
  const baseId = id.substring(0, id.indexOf('[') !== -1 ? id.indexOf('[') : id.indexOf('.'));
  return baseId;
};
