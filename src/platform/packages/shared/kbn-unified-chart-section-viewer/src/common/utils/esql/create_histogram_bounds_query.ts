/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { getMetricUniqueKey } from '../get_metric_unique_key';
import type { HistogramBoundsQuery, ParsedMetricItem } from '../../../types';
import { getHistogramFieldExpression } from './create_histogram_distribution_query';
import { resolveSource } from './esql_helpers';

export const HISTOGRAM_BOUNDS_MIN_COLUMN = 'min_value';
export const HISTOGRAM_BOUNDS_MAX_COLUMN = 'max_value';

/** Builds the MIN/MAX ES|QL query for a histogram chart, or `undefined` for non-histogram metrics. */
export const createHistogramBoundsQuery = ({
  metricItem,
  whereStatements = [],
  originalSource,
}: {
  metricItem: ParsedMetricItem;
  whereStatements?: readonly string[];
  originalSource?: string;
}): HistogramBoundsQuery | undefined => {
  const expression = getHistogramFieldExpression(metricItem);
  if (!expression) {
    return undefined;
  }

  const source = resolveSource(originalSource, metricItem.indexName);
  const query = esql.ts(source);
  // User applied filters may reference a field the metric stream lacks of, so NULLIFY prevents throwing exceptions
  // TODO(https://github.com/elastic/kibana/issues/291132): add only when a WHERE references an unmapped field.
  query.addSetCommand('unmapped_fields', 'NULLIFY');

  for (const statement of whereStatements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      query.pipe(`WHERE ${trimmed}`);
    }
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
