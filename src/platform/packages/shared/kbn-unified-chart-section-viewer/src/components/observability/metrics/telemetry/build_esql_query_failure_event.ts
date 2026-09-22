/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSourceCommandFromESQLQuery } from '@kbn/esql-utils';
import {
  classifyChartSectionError,
  getChartSectionErrorMeta,
} from '../../../../common/errors/classify_chart_section_error';
import { isSuppressedFetchError } from '../../../chart/utils/is_suppressed_fetch_error';
import { METRICS_PROFILE_TELEMETRY_NAME } from './constants';
import type { MetricsEsqlQueryFailureEvent, MetricsEsqlQueryType } from './types';

const toQueryType = (esqlQuery: string): MetricsEsqlQueryType => {
  const sourceCommand = getSourceCommandFromESQLQuery(esqlQuery);
  return sourceCommand === 'TS' || sourceCommand === 'FROM' ? sourceCommand : 'unknown';
};

/**
 * Builds the {@link METRICS_ESQL_QUERY_FAILURE_EVENT_TYPE} payload for a landed
 * ES|QL failure, or returns undefined for failures that must not be counted:
 * cancelled refetches (`AbortError`) and non-Error rejections. Mirrors the
 * suppression rules the APM reporter applies so both signals count the same
 * failures. Optional Elasticsearch metadata is omitted when unset, matching
 * the APM reporter.
 */
export const buildEsqlQueryFailureEvent = ({
  error,
  esqlQuery,
}: {
  error: unknown;
  esqlQuery: string;
}): MetricsEsqlQueryFailureEvent | undefined => {
  if (isSuppressedFetchError(error) || !(error instanceof Error)) {
    return undefined;
  }

  const { type, status } = getChartSectionErrorMeta(error);

  return {
    ...(type ? { error_type: type } : {}),
    error_category: classifyChartSectionError(error),
    ...(status != null ? { status_code: status } : {}),
    query_type: toQueryType(esqlQuery),
    profile: METRICS_PROFILE_TELEMETRY_NAME,
  };
};
