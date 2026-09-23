/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { fieldConstants } from '@kbn/discover-utils';
import { escapeStringValue, isSingleSource, sanitazeESQLInput } from '@kbn/esql-utils';
import {
  EXEMPLARS_MAX_ROWS,
  EXEMPLARS_METRIC_NAME_FIELD,
  EXEMPLARS_VALUE_FIELD,
} from '../../constants';
import { deriveExemplarsIndex } from '../exemplars/derive_exemplars_index';
import type { ParsedMetricItem } from '../../../types';

const { TIMESTAMP_FIELD, TRACE_ID_FIELD, SPAN_ID_FIELD } = fieldConstants;

// `trace.id` and `span.id` are aliases of the stream's native `trace_id` / `span_id`.
const BASE_COLUMNS = [
  TIMESTAMP_FIELD,
  EXEMPLARS_METRIC_NAME_FIELD,
  EXEMPLARS_VALUE_FIELD,
  TRACE_ID_FIELD,
  SPAN_ID_FIELD,
];

interface CreateExemplarsQueryParams {
  metricItem: ParsedMetricItem;
  /** The user's own ES|QL `WHERE` fragments, re-applied so exemplars match the chart's filters. */
  whereStatements?: string[];
  /** The source the user typed; wins over `metricItem.indexName` when it is one concrete index. */
  originalSource?: string;
  maxRows?: number;
}

/**
 * Builds the ES|QL query that fetches OTel exemplars for one metric, or `''` when the metric
 * cannot have exemplars. Takes no breakdown accessors on purpose: breaking the chart down
 * must not change which exemplars are fetched.
 */
export function createExemplarsQuery({
  metricItem,
  whereStatements = [],
  originalSource,
  maxRows = EXEMPLARS_MAX_ROWS,
}: CreateExemplarsQueryParams): string {
  const { metricName, indexName, dimensionFields } = metricItem;
  const metricsIndex = isSingleSource(originalSource) ? originalSource : indexName;
  const exemplarsIndex = deriveExemplarsIndex(metricsIndex);

  if (!exemplarsIndex || !metricName) {
    return '';
  }

  // TODO(elasticsearch#154786): swap `FROM <index>` for `TS_EXEMPLARS` when available.
  const query = esql.from(exemplarsIndex);

  const exemplarMetricName = escapeStringValue(metricName.replace(/^metrics\./, ''));
  query.pipe(`WHERE ${EXEMPLARS_METRIC_NAME_FIELD} == ${exemplarMetricName}`);

  for (const statement of whereStatements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      query.pipe(`WHERE ${trimmed}`);
    }
  }

  const keepColumns = [
    ...BASE_COLUMNS,
    ...dimensionFields
      .filter(({ name }) => !BASE_COLUMNS.includes(name))
      .map(({ name }) => sanitazeESQLInput(name)),
  ];
  query.pipe(`KEEP ${keepColumns.join(', ')}`);

  query.pipe(`SORT ${TIMESTAMP_FIELD} DESC`);
  query.pipe(`LIMIT ${maxRows}`);

  return query.print('pipe-multiline');
}
