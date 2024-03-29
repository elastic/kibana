/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const timeOffsetFiltersWithZeroDocCountResponse = {
  hits: {
    total: 474,
    max_score: 0,
    hits: [],
  },
  aggregations: {
    doc_count: 0,
    doc_count_86400000: 234,
  },
};
