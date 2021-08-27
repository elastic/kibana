/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPatternField } from '../../../../../../../../data/common/index_patterns/fields/index_pattern_field';
import { IndexPattern } from '../../../../../../../../data/common/index_patterns/index_patterns/index_pattern';
import type { ElasticSearchHit } from '../../../../../doc_views/doc_views_types';
import { fieldCalculator } from './field_calculator';

// @ts-expect-error

export function getDetails(
  field: IndexPatternField,
  hits: ElasticSearchHit[],
  columns: string[],
  indexPattern?: IndexPattern
) {
  if (!indexPattern) {
    return {};
  }
  const details = {
    ...fieldCalculator.getFieldValueCounts({
      hits,
      field,
      indexPattern,
      count: 5,
      grouped: false,
    }),
    columns,
  };
  if (details.buckets) {
    for (const bucket of details.buckets) {
      bucket.display = indexPattern.getFormatterForField(field).convert(bucket.value);
    }
  }
  return details;
}
