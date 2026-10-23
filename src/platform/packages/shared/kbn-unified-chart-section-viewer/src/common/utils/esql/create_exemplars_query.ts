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
import { escapeStringValue } from '@kbn/esql-utils';
import { EXEMPLARS_MAX_ROWS, EXEMPLARS_METRIC_NAME_FIELD } from '../../constants';
import type { ParsedMetricItem } from '../../../types';

const { TIMESTAMP_FIELD } = fieldConstants;

interface CreateExemplarsQueryParams {
  metricItem: ParsedMetricItem;
  /** The metric's exemplars data stream, from `resolveExemplarsIndex`. */
  exemplarsIndex: string;
  whereStatements?: string[];
  maxRows?: number;
}

/**
 * Builds the ES|QL query that fetches OTel exemplars for one metric from `exemplarsIndex`, or
 * `''` when the metric has no name. Returns whole documents (no `KEEP`) so the inspect view can
 * show every field an exemplar carries. Takes no breakdown accessors on purpose: breaking the
 * chart down does not change which exemplars are fetched.
 */
export function createExemplarsQuery({
  metricItem,
  exemplarsIndex,
  whereStatements = [],
  maxRows = EXEMPLARS_MAX_ROWS,
}: CreateExemplarsQueryParams): string {
  const { metricName } = metricItem;

  if (!metricName) {
    return '';
  }

  // Inherited `WHERE` clauses can reference metric fields that exist only in the metrics stream;
  // the exemplars mapping is dynamic, so those are unmapped and would fail verification.
  const query = esql.from(exemplarsIndex);
  query.addSetCommand('unmapped_fields', 'NULLIFY');

  const exemplarMetricName = escapeStringValue(metricName.replace(/^metrics\./, ''));
  query.pipe(`WHERE ${EXEMPLARS_METRIC_NAME_FIELD} == ${exemplarMetricName}`);

  for (const statement of whereStatements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      query.pipe(`WHERE ${trimmed}`);
    }
  }

  query.pipe(`SORT ${TIMESTAMP_FIELD} DESC`);
  query.pipe(`LIMIT ${maxRows}`);

  return query.print('pipe-multiline');
}
