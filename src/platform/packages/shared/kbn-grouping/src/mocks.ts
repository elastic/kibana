/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const groupingBucket = {
  key: '192.168.0.4',
  doc_count: 75,
  hostsCountAggregation: { value: 1 },
  rulesCountAggregation: { value: 32 },
  unitsCount: { value: 1920 },
  severitiesSubAggregation: {
    doc_count_error_upper_bound: 0,
    sum_other_doc_count: 0,
    buckets: [
      { key: 'critical', doc_count: 480 },
      { key: 'high', doc_count: 480 },
      { key: 'low', doc_count: 480 },
      { key: 'medium', doc_count: 480 },
    ],
  },
  countSeveritySubAggregation: { value: 4 },
};
