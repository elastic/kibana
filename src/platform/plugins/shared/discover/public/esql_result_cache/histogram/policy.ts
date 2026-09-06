/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DiscoverCustomizationContext } from '../../customizations';
import { isValidNonTransformationalESQLQuery } from '../../context_awareness/utils/is_valid_non_transformational_esql_query';

export const isEsqlHistogramCacheEligible = ({
  breakdownField,
  chartHidden,
  displayMode,
  hasPersistedDiscoverSession,
  isEmbeddedEditor,
  isSearchSessionRestored,
  query,
  visContext,
}: {
  breakdownField: string | undefined;
  chartHidden: boolean | undefined;
  displayMode: DiscoverCustomizationContext['displayMode'];
  hasPersistedDiscoverSession: boolean;
  isEmbeddedEditor: boolean;
  isSearchSessionRestored: boolean;
  query: AggregateQuery | Query | undefined;
  visContext: unknown;
}) =>
  displayMode === 'standalone' &&
  !isEmbeddedEditor &&
  !hasPersistedDiscoverSession &&
  !isSearchSessionRestored &&
  !chartHidden &&
  !breakdownField &&
  !visContext &&
  isValidNonTransformationalESQLQuery(query);

interface EsqlHistogramFingerprintParams {
  controlsState: unknown;
  dataViewId: string | undefined;
  dataViewIndexPattern: string | undefined;
  esql: string;
  esqlVariables: ESQLControlVariable[] | undefined;
  filters: Filter[] | undefined;
  interval: string | undefined;
  isApproximate: boolean | undefined;
  timeFieldName: string | undefined;
  timeRange: TimeRange | undefined;
}

/**
 * Identifies the state that produced a cached ES|QL histogram.
 * TODO: Include root and data source profile identity before production rollout.
 */
export const getEsqlHistogramFingerprint = (params: EsqlHistogramFingerprintParams) =>
  JSON.stringify(params);
