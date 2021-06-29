/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, isEmpty } from 'lodash';

export function getAnnotationBuckets(resp, annotation) {
  return get(resp, `aggregations.${annotation.id}.buckets`, [])
    .filter((bucket) => !isEmpty(bucket.hits.hits.hits))
    .map((bucket) => ({
      key: bucket.key,
      docs: bucket.hits.hits.hits.map((doc) => doc._source),
    }));
}
