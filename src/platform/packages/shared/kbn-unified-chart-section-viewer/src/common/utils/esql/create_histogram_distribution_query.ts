/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql, BasicPrettyPrinter } from '@elastic/esql';
import type { HistogramBounds, ParsedMetricItem } from '../../../types';
import { firstNonNullable } from '../first_null_nullable';
import { isHistogramMetric, isLegacyHistogram } from '../histogram_metric';
import { createTimeBucketAggregation } from './create_aggregation';
import { fieldNameToColumn, resolveSource } from './helpers';
import { needsUnmappedFieldsNullify } from './needs_unmapped_fields_nullify';

export const HISTOGRAM_BUCKET_COUNT = 10;
export const HISTOGRAM_COUNT_COLUMN = 'count';
export const HISTOGRAM_BUCKET_COLUMN = 'bucket';

export const getHistogramFieldExpression = (metricItem: ParsedMetricItem): string | undefined => {
  const fieldType = firstNonNullable(metricItem.fieldTypes);
  const instrument = firstNonNullable(metricItem.metricTypes);
  if (!isHistogramMetric(fieldType, instrument)) {
    return undefined;
  }

  const column = BasicPrettyPrinter.print(fieldNameToColumn(metricItem.metricName));
  // `TS` aggregations do not accept the legacy `histogram` type, so cast it to tdigest first.
  if (isLegacyHistogram(fieldType, instrument)) {
    return `TO_TDIGEST(${column})`;
  }

  return column;
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
  const trimmedWhere = whereStatements
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  // `metrics_info` guarantees the metric field is mapped. NULLIFY is only needed
  // when WHERE can name a column this stream may not map.
  if (needsUnmappedFieldsNullify({ whereStatements: trimmedWhere })) {
    query.addSetCommand('unmapped_fields', 'NULLIFY');
  }

  for (const statement of trimmedWhere) {
    query.pipe(`WHERE ${statement}`);
  }

  const timeBucket = createTimeBucketAggregation({});
  // BUCKET emits a null bucket when from equals to. A tiny span still places the constant value in one bucket.
  const max =
    bounds.min < bounds.max
      ? bounds.max
      : bounds.min + Math.max(Math.abs(bounds.min) * 1e-6, Number.EPSILON);
  query.pipe(
    `STATS ${HISTOGRAM_COUNT_COLUMN} = COUNT(${expression}, ${HISTOGRAM_BUCKET_COLUMN}) ` +
      `BY ${HISTOGRAM_BUCKET_COLUMN} = BUCKET(${expression}, ${HISTOGRAM_BUCKET_COUNT}, ${bounds.min}, ${max}), ${timeBucket}`
  );
  query.pipe(`EVAL ${HISTOGRAM_BUCKET_COLUMN} = RANGE_MIN(${HISTOGRAM_BUCKET_COLUMN})`);
  // Lens builder doesn't allow to change sorting. We need to keep the SORT part until the new API builder (Lens as a code) is implemented.
  query.pipe(`SORT ${HISTOGRAM_BUCKET_COLUMN} DESC`);

  return query.print('pipe-multiline');
};
