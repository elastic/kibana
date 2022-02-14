/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ChangePoint } from './use_change_point_detection';

export interface HistogramItem {
  key: number;
  doc_count: number;
}

export interface FieldValuePair {
  fieldName: string;
  // For dynamic fieldValues we only identify fields as `string`,
  // but for example `http.response.status_code` which is part of
  // of the list of predefined field candidates is of type long/number.
  fieldValue: string | number;
}

export interface FailedTransactionsCorrelation extends FieldValuePair {
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
  normalizedScore: number;
  failurePercentage: number;
  successPercentage: number;
  histogram: HistogramItem[];
}

export interface LatencyCorrelation extends FieldValuePair {
  correlation: number;
  histogram: HistogramItem[];
  ksTest: number;
}

export interface CorrelationsProgress {
  error?: string;
  isRunning: boolean;
  loaded: number;
}

export function getChangePointsSortedByScore(changePoints: ChangePoint[]) {
  return changePoints.sort((a, b) => b.score - a.score);
}

export function getLatencyCorrelationsSortedByCorrelation(
  latencyCorrelations: LatencyCorrelation[]
) {
  return latencyCorrelations.sort((a, b) => b.correlation - a.correlation);
}

export function getFailedTransactionsCorrelationsSortedByScore(
  failedTransactionsCorrelations: FailedTransactionsCorrelation[]
) {
  return failedTransactionsCorrelations.sort((a, b) => b.score - a.score);
}

export const getInitialResponse = () => ({
  ccsWarning: false,
  isRunning: false,
  loaded: 0,
});

export const getReducer =
  <T>() =>
  (prev: T, update: Partial<T>): T => ({
    ...prev,
    ...update,
  });
