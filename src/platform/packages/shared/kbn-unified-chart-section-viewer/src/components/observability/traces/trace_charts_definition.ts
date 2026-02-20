/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AT_TIMESTAMP,
  DURATION,
  EVENT_OUTCOME,
  PROCESSOR_EVENT,
  STATUS_CODE,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  SPAN_ID,
} from '@kbn/apm-types';
import { evaluate, from, keep, sort, stats, where } from '@kbn/esql-composer';
import { i18n } from '@kbn/i18n';
import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { MetricUnit } from '../../../types';
import { chartPalette } from '.';

interface TraceChart {
  id: string;
  title: string;
  color: string;
  unit: MetricUnit;
  seriesType: LensSeriesLayer['seriesType'];
  esqlQuery: string;
}

const UNMAPPED_FIELDS_NULLIFY_SET_COMMAND = 'SET unmapped_fields="NULLIFY";';

function getWhereClauses(filters: string[]) {
  return [
    ...filters,
    ...[`TO_STRING(${PROCESSOR_EVENT}) == "transaction" OR ${PROCESSOR_EVENT} IS NULL`],
  ].map((filter) => where(filter));
}

function getMetadataDirective(metadataFields: string[]) {
  return metadataFields.length ? `METADATA ${metadataFields}` : undefined;
}

export function getErrorRateChart({
  indexes,
  filters,
  metadataFields,
}: {
  indexes: string;
  filters: string[];
  metadataFields: string[];
}): TraceChart | null {
  try {
    const whereClauses = getWhereClauses(filters);
    const metadataDirective = getMetadataDirective(metadataFields);
    const esqlQuery = from(metadataDirective ? `${indexes} ${metadataDirective}` : indexes)
      .pipe(
        ...whereClauses,
        stats(
          `failure = COUNT(*) WHERE TO_STRING(${EVENT_OUTCOME}) == "failure" OR TO_STRING(${STATUS_CODE}) == "Error", all = COUNT(*)  BY timestamp = BUCKET(${AT_TIMESTAMP}, 100, ?_tstart, ?_tend)`
        ),
        evaluate('error_rate = TO_DOUBLE(failure) / all'),
        keep('timestamp, error_rate'),
        sort('timestamp')
      )
      .toString();

    return {
      id: 'error_rate',
      title: i18n.translate('metricsExperience.grid.error_rate.label', {
        defaultMessage: 'Error Rate',
      }),
      color: chartPalette[6],
      unit: 'percent',
      seriesType: 'line',
      esqlQuery: `${UNMAPPED_FIELDS_NULLIFY_SET_COMMAND} ${esqlQuery}`,
    };
  } catch (error) {
    return null;
  }
}

export function getLatencyChart({
  indexes,
  filters,
  metadataFields,
}: {
  indexes: string;
  filters: string[];
  metadataFields: string[];
}): TraceChart | null {
  try {
    const whereClauses = getWhereClauses(filters);
    const metadataDirective = getMetadataDirective(metadataFields);
    const esqlQuery = from(metadataDirective ? `${indexes} ${metadataDirective}` : indexes)
      .pipe(
        ...whereClauses,
        evaluate(`duration_ms_ecs = ROUND(${TRANSACTION_DURATION})/1000`), // apm duration is in us
        evaluate(`duration_ms_otel = ROUND(${DURATION})/1000/1000`), // otel duration is in ns
        evaluate('duration_ms = COALESCE(TO_LONG(duration_ms_ecs), TO_LONG(duration_ms_otel))'), // need to convert both to the same type to make sure the COALESCE works
        stats(`AVG(duration_ms) BY BUCKET(${AT_TIMESTAMP}, 100, ?_tstart, ?_tend)`)
      )
      .toString();

    return {
      id: 'latency',
      title: i18n.translate('metricsExperience.grid.latency.label', {
        defaultMessage: 'Latency',
      }),
      color: chartPalette[2],
      unit: 'ms',
      seriesType: 'line',
      esqlQuery: `${UNMAPPED_FIELDS_NULLIFY_SET_COMMAND} ${esqlQuery}`,
    };
  } catch (error) {
    return null;
  }
}

export function getThroughputChart({
  indexes,
  filters,
  metadataFields,
}: {
  indexes: string;
  filters: string[];
  metadataFields: string[];
}): TraceChart | null {
  try {
    const whereClauses = getWhereClauses(filters);
    const metadataDirective = getMetadataDirective(metadataFields);
    const esqlQuery = from(metadataDirective ? `${indexes} ${metadataDirective}` : indexes)
      .pipe(
        ...whereClauses,
        evaluate(`id = COALESCE(${TRANSACTION_ID}, ${SPAN_ID})`),
        stats(`COUNT(id) BY BUCKET(${AT_TIMESTAMP}, 100, ?_tstart, ?_tend)`)
      )
      .toString();

    return {
      id: 'throughput',
      title: i18n.translate('metricsExperience.grid.throughput.label', {
        defaultMessage: 'Throughput',
      }),
      color: chartPalette[0],
      unit: 'count',
      seriesType: 'line',
      esqlQuery: `${UNMAPPED_FIELDS_NULLIFY_SET_COMMAND} ${esqlQuery}`,
    };
  } catch (error) {
    return null;
  }
}
