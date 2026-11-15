/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import type { MetricsGridSettings } from '@kbn/discover-utils';
import type { ParsedMetricItem } from '../../../types';
import { createESQLQuery } from './create_esql_query';

interface CreateExemplarsQueryParams {
  metricItem: ParsedMetricItem;
  whereStatements?: string[];
  metadataFields?: string[];
  originalSource?: string;
  gridSettings?: MetricsGridSettings;
}

/**
 * Builds the exemplar query for one metric chart, or `''` when the chart has no time-series query.
 * Uses the chart's `TS | STATS` query with no breakdown dimensions, so a grid split does not change
 * which exemplars are fetched. Callers skip unsupported charts before calling this.
 */
export function createExemplarsQuery({
  metricItem,
  whereStatements,
  metadataFields,
  originalSource,
  gridSettings,
}: CreateExemplarsQueryParams): string {
  const chartQuery = createESQLQuery({
    metricItem,
    splitAccessors: [],
    whereStatements,
    metadataFields,
    originalSource,
    gridSettings,
  });

  if (!chartQuery) {
    return '';
  }

  return esql(chartQuery).addSetCommand('exemplars', true).print('pipe-multiline');
}
