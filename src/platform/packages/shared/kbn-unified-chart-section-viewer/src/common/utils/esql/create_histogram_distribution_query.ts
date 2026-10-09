/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql, BasicPrettyPrinter } from '@elastic/esql';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { HistogramBounds, ParsedMetricItem } from '../../../types';
import { firstNonNullable } from '../first_null_nullable';
import { createTimeBucketAggregation } from './create_aggregation';
import { fieldNameToColumn, resolveSource } from './esql_helpers';

const HISTOGRAM_FIELD_TYPES: ReadonlySet<ES_FIELD_TYPES> = new Set([
  ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM,
  ES_FIELD_TYPES.TDIGEST,
  ES_FIELD_TYPES.HISTOGRAM,
]);

export const HISTOGRAM_BUCKET_COUNT = 10;
export const HISTOGRAM_COUNT_COLUMN = 'count';
export const HISTOGRAM_BUCKET_COLUMN = 'bucket';

/** Field expression for a supported single-histogram metric, or `undefined` otherwise. */
export const getHistogramFieldExpression = (metricItem: ParsedMetricItem): string | undefined => {
  if (firstNonNullable(metricItem.metricTypes) !== 'histogram') {
    return undefined;
  }

  // One metric can carry different histogram mappings across streams. A single cast for a mixed
  // set would fail with a verification_exception, so only continue when the type is unambiguous.
  const uniqueFieldTypes = new Set(metricItem.fieldTypes.filter(Boolean));
  if (uniqueFieldTypes.size !== 1) {
    return undefined;
  }

  const [fieldType] = uniqueFieldTypes;
  if (!HISTOGRAM_FIELD_TYPES.has(fieldType)) {
    return undefined;
  }

  const column = BasicPrettyPrinter.print(fieldNameToColumn(metricItem.metricName));

  // `TS` aggregations only accept `exponential_histogram` and `tdigest`.
  return fieldType === ES_FIELD_TYPES.HISTOGRAM ? `TO_TDIGEST(${column})` : column;
};

/** Builds the distribution-over-time ES|QL query for a histogram chart, or `undefined` for non-histogram metrics. */
export const createHistogramDistributionQuery = ({
  metricItem,
  bounds,
  whereStatements = [],
  originalSource,
}: {
  metricItem: ParsedMetricItem;
  bounds: HistogramBounds; // until https://github.com/elastic/elasticsearch/issues/158876 is ready
  whereStatements?: readonly string[];
  originalSource?: string;
}): string | undefined => {
  const expression = getHistogramFieldExpression(metricItem);
  if (!expression) {
    return undefined;
  }

  const index = resolveSource(originalSource, metricItem.indexName);
  const query = esql.ts(index);
  // User applied filters may reference a field the metric stream lacks of, so NULLIFY prevents throwing exceptions.
  // TODO(https://github.com/elastic/kibana/issues/291132): add only when a WHERE references an unmapped field.
  query.addSetCommand('unmapped_fields', 'NULLIFY');

  for (const statement of whereStatements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      query.pipe(`WHERE ${trimmed}`);
    }
  }

  const timeBucket = createTimeBucketAggregation({});
  query.pipe(
    `STATS ${HISTOGRAM_COUNT_COLUMN} = COUNT(${expression}, ${HISTOGRAM_BUCKET_COLUMN}) ` +
      `BY ${HISTOGRAM_BUCKET_COLUMN} = BUCKET(${expression}, ${HISTOGRAM_BUCKET_COUNT}, ${bounds.min}, ${bounds.max}), ${timeBucket}`
  );
  query.pipe(`EVAL ${HISTOGRAM_BUCKET_COLUMN} = RANGE_MIN(${HISTOGRAM_BUCKET_COLUMN})`);

  return query.print('pipe-multiline');
};
