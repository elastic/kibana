/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql, synth, BasicPrettyPrinter } from '@elastic/esql';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { isSingleSource } from '@kbn/esql-utils';
import { firstNonNullable } from '../first_null_nullable';
import { getMetricUniqueKey } from '../get_metric_unique_key';
import type { HistogramBoundsQuery, ParsedMetricItem } from '../../../types';

export const HISTOGRAM_BOUNDS_MIN_COLUMN = 'min_value';
export const HISTOGRAM_BOUNDS_MAX_COLUMN = 'max_value';

const HISTOGRAM_FIELD_TYPES: ReadonlySet<ES_FIELD_TYPES> = new Set([
  ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM,
  ES_FIELD_TYPES.TDIGEST,
  ES_FIELD_TYPES.HISTOGRAM,
]);

const getBoundsExpression = (metricItem: ParsedMetricItem): string | undefined => {
  if (firstNonNullable(metricItem.metricTypes) !== 'histogram') {
    return undefined;
  }

  // The same fieldTypes list is copied onto every per-index chart. A field typed as
  // histogram in one stream and exponential_histogram in another would get one cast
  // for both and fail with a verification_exception.
  const uniqueFieldTypes = new Set(metricItem.fieldTypes.filter(Boolean));
  if (uniqueFieldTypes.size !== 1) {
    return undefined;
  }

  const [fieldType] = uniqueFieldTypes;
  if (!HISTOGRAM_FIELD_TYPES.has(fieldType)) {
    return undefined;
  }

  const column = BasicPrettyPrinter.print(synth.col(metricItem.metricName.split('.')));

  // `TS` aggregations only accept `exponential_histogram` and `tdigest`.
  return fieldType === ES_FIELD_TYPES.HISTOGRAM ? `TO_TDIGEST(${column})` : column;
};

/**
 * Builds the MIN/MAX ES|QL query for one histogram chart, or `undefined` for non-histogram metrics.
 */
export const createHistogramBoundsQuery = ({
  metricItem,
  whereStatements = [],
  originalSource,
}: {
  metricItem: ParsedMetricItem;
  whereStatements?: readonly string[];
  originalSource?: string;
}): HistogramBoundsQuery | undefined => {
  const expression = getBoundsExpression(metricItem);
  if (!expression) {
    return undefined;
  }

  const source = isSingleSource(originalSource) ? originalSource : metricItem.indexName;
  const query = esql.ts(source);
  const trimmedWhere = whereStatements
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  // `metrics_info` guarantees the metric field is mapped. WHERE can reference
  // other fields that are missing on this index.
  if (trimmedWhere.length > 0) {
    query.addSetCommand('unmapped_fields', 'NULLIFY');
  }

  for (const statement of trimmedWhere) {
    query.pipe(`WHERE ${statement}`);
  }

  query.pipe(
    `STATS ${HISTOGRAM_BOUNDS_MIN_COLUMN} = MIN(${expression}), ${HISTOGRAM_BOUNDS_MAX_COLUMN} = MAX(${expression})`
  );

  return {
    metricKey: getMetricUniqueKey(metricItem),
    source,
    esqlQuery: query.print('pipe-multiline'),
  };
};
