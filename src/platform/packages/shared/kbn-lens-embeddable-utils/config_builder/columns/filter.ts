/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Query } from '@kbn/es-query';
import { LensApiMetricOperation } from '../schema/metric_ops';

export function fromFilterAPIToLensState(
  filter: LensApiMetricOperation['filter']
): Query | undefined {
  if (!filter) {
    return;
  }
  // @TODO: check label prop
  const { query } = filter;
  return { query: query.query, language: query.language };
}

export function fromFilterLensStateToAPI(filter: Query): LensApiMetricOperation['filter'] {
  if (typeof filter.query !== 'string') {
    return;
  }
  return {
    label: '',
    query: {
      query: filter.query,
      language: filter.language as 'kuery' | 'lucene',
    },
  };
}
