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
} from '@kbn/apm-types';
import { evaluate, from, keep, sort, stats, where } from '@kbn/esql-composer';
import { i18n } from '@kbn/i18n';
import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { MetricUnit } from '../../types';
import { chartPalette, type DataSource } from '.';

interface TraceChart {
  id: string;
  title: string;
  color: string;
  unit: MetricUnit;
  seriesType: LensSeriesLayer['seriesType'];
  esqlQuery: string;
}

function getWhereClauses(dataSource: DataSource, filters: string[]) {
  return [...filters, ...(dataSource === 'apm' ? [`${PROCESSOR_EVENT} == "transaction"`] : [])].map(
    (filter) => where(filter)
  );
}

export function getErrorRateChart({
  dataSource,
  indexes,
  filters,
}: {
  dataSource: DataSource;
  indexes: string;
  filters: string[];
}): TraceChart | null {
  try {
    const whereClauses = getWhereClauses(dataSource, filters);
    const esqlQuery = from(indexes)
      .pipe(
        ...whereClauses,
        dataSource === 'apm'
          ? stats(
              `failure = COUNT(*) WHERE ${EVENT_OUTCOME} == "failure", all = COUNT(*)  BY timestamp = BUCKET(${AT_TIMESTAMP}, 100, ?_tstart, ?_tend)`
            )
          : stats(
              `failure = COUNT(*) WHERE ${STATUS_CODE} == "Error", all = COUNT(*)  BY timestamp = BUCKET(${AT_TIMESTAMP}, 100, ?_tstart, ?_tend)`
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
      esqlQuery,
    };
  } catch (error) {
    return null;
  }
}

export function getLatencyChart({
  dataSource,
  indexes,
  filters,
}: {
  dataSource: DataSource;
  indexes: string;
  filters: string[];
}): TraceChart | null {
  try {
    const whereClauses = getWhereClauses(dataSource, filters);
    const esqlQuery = from(indexes)
      .pipe(
        ...whereClauses,
        dataSource === 'apm'
          ? evaluate(`duration_ms = ROUND(${TRANSACTION_DURATION})/1000`) // apm duration is in us
          : evaluate(`duration_ms = ROUND(${DURATION})/1000/1000`), // otel duration is in ns
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
      esqlQuery,
    };
  } catch (error) {
    return null;
  }
}

export function getThroughputChart({
  indexes,
  filters,
  dataSource,
  fieldName,
}: {
  indexes: string;
  filters: string[];
  dataSource: DataSource;
  fieldName: string;
}): TraceChart | null {
  try {
    const whereClauses = getWhereClauses(dataSource, filters);
    const esqlQuery = from(indexes)
      .pipe(
        ...whereClauses,
        stats(`COUNT(${fieldName}) BY BUCKET(${AT_TIMESTAMP}, 100, ?_tstart, ?_tend)`)
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
      esqlQuery,
    };
  } catch (error) {
    return null;
  }
}
