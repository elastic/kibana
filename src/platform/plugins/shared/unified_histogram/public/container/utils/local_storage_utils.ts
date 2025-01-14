/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';

export const CHART_HIDDEN_KEY = 'chartHidden';
export const HISTOGRAM_HEIGHT_KEY = 'histogramHeight';
export const HISTOGRAM_BREAKDOWN_FIELD_KEY = 'histogramBreakdownField';

const getLocalStorageKey = (prefix: string, key: string) => `${prefix}:${key}`;

/**
 * Get the chart hidden state from local storage
 */
export const getChartHidden = (
  storage: Storage,
  localStorageKeyPrefix: string
): boolean | undefined => storage.get(getLocalStorageKey(localStorageKeyPrefix, CHART_HIDDEN_KEY));

/**
 * Get the top panel height from local storage
 */
export const getTopPanelHeight = (
  storage: Storage,
  localStorageKeyPrefix: string
): number | undefined =>
  storage.get(getLocalStorageKey(localStorageKeyPrefix, HISTOGRAM_HEIGHT_KEY)) ?? undefined;

/**
 * Get the breakdown field from local storage
 */
export const getBreakdownField = (
  storage: Storage,
  localStorageKeyPrefix: string
): string | undefined =>
  storage.get(getLocalStorageKey(localStorageKeyPrefix, HISTOGRAM_BREAKDOWN_FIELD_KEY)) ??
  undefined;

/**
 * Set the chart hidden state in local storage
 */
export const setChartHidden = (
  storage: Storage,
  localStorageKeyPrefix: string,
  chartHidden: boolean | undefined
) => storage.set(getLocalStorageKey(localStorageKeyPrefix, CHART_HIDDEN_KEY), chartHidden);

/**
 * Set the top panel height in local storage
 */
export const setTopPanelHeight = (
  storage: Storage,
  localStorageKeyPrefix: string,
  topPanelHeight: number | undefined
) => storage.set(getLocalStorageKey(localStorageKeyPrefix, HISTOGRAM_HEIGHT_KEY), topPanelHeight);

/**
 * Set the breakdown field in local storage
 */
export const setBreakdownField = (
  storage: Storage,
  localStorageKeyPrefix: string,
  breakdownField: string | undefined
) =>
  storage.set(
    getLocalStorageKey(localStorageKeyPrefix, HISTOGRAM_BREAKDOWN_FIELD_KEY),
    breakdownField
  );
