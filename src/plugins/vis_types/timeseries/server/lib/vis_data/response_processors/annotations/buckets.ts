/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, isEmpty } from 'lodash';
import type { SearchResponse } from '@kbn/core/server';
import { overwrite } from '../../helpers';
import type { Annotation } from '../../../../../common/types';

interface AnnotationsBuckets {
  key: string;
  hits: {
    hits: {
      hits: Array<{ fields: Record<string, unknown[]> }>;
    };
  };
}

const concatenateValues = (values: unknown[]) => values.join(',');

export function getAnnotationBuckets(resp: SearchResponse, annotation: Annotation) {
  const buckets = get(resp, `aggregations.${annotation.id}.buckets`, []) as AnnotationsBuckets[];

  return buckets
    .filter((bucket) => !isEmpty(bucket.hits.hits.hits))
    .map((bucket) => ({
      key: bucket.key,
      docs: bucket.hits.hits.hits.map((doc) =>
        Object.keys(doc.fields).reduce((acc, key) => {
          overwrite(acc, key, concatenateValues(doc.fields[key]));
          return acc;
        }, {})
      ),
    }));
}
