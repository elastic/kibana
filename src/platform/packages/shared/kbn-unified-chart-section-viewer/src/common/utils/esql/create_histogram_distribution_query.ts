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
import { isLegacyHistogram } from '../legacy_histogram';
import { createTimeBucketAggregation } from './create_aggregation';
import { fieldNameToColumn, resolveSource } from './helpers';

const HISTOGRAM_FIELD_TYPES: ReadonlySet<ES_FIELD_TYPES> = new Set([
  ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM,
  ES_FIELD_TYPES.TDIGEST,
  ES_FIELD_TYPES.HISTOGRAM,
]);

export const HISTOGRAM_BUCKET_COUNT = 10;
export const HISTOGRAM_COUNT_COLUMN = 'count';
export const HISTOGRAM_BUCKET_COLUMN = 'bucket';

export const getHistogramFieldExpression = (metricItem: ParsedMetricItem): string | undefined => {
  const fieldType = firstNonNullable(metricItem.fieldTypes);
  const instrument = firstNonNullable(metricItem.metricTypes);
  const column = BasicPrettyPrinter.print(fieldNameToColumn(metricItem.metricName));

  // `TS` aggregations do not accept the legacy `histogram` type, so cast it to tdigest first.
  if (isLegacyHistogram(fieldType, instrument)) {
    return `TO_TDIGEST(${column})`;
  }

  if (instrument === 'histogram' && HISTOGRAM_FIELD_TYPES.has(fieldType)) {
    return column;
  }

  return undefined;
};

/** Builds the distribution-over-time ES|QL query for a histogram chart, or `undefined` for non-histogram metrics. */
export const createHistogramDistributionQuery = ({
  metricItem,
  bounds,
  whereStatements = [],
  originalSource,
}: {
  metricItem: ParsedMetricItem;
  bounds: HistogramBounds; // temporary until https://github.com/elastic/elasticsearch/issues/158876 is resolved
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
