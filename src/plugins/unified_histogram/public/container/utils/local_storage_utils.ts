/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';

export const CHART_HIDDEN_KEY = 'chartHidden';
export const HISTOGRAM_HEIGHT_KEY = 'histogramHeight';
export const HISTOGRAM_BREAKDOWN_FIELD_KEY = 'histogramBreakdownField';

const getLocalStorageKey = (prefix: string, key: string) => `${prefix}:${key}`;

export const getChartHidden = (storage: Storage, localStorageKeyPrefix: string): boolean =>
  storage.get(getLocalStorageKey(localStorageKeyPrefix, CHART_HIDDEN_KEY)) ?? false;

export const getTopPanelHeight = (
  storage: Storage,
  localStorageKeyPrefix: string
): number | undefined =>
  storage.get(getLocalStorageKey(localStorageKeyPrefix, HISTOGRAM_HEIGHT_KEY)) ?? undefined;

export const getBreakdownField = (
  storage: Storage,
  localStorageKeyPrefix: string
): string | undefined =>
  storage.get(getLocalStorageKey(localStorageKeyPrefix, HISTOGRAM_BREAKDOWN_FIELD_KEY)) ??
  undefined;

export const setChartHidden = (
  storage: Storage,
  localStorageKeyPrefix: string,
  chartHidden: boolean | undefined
) => storage.set(getLocalStorageKey(localStorageKeyPrefix, CHART_HIDDEN_KEY), chartHidden) ?? false;

export const setTopPanelHeight = (
  storage: Storage,
  localStorageKeyPrefix: string,
  topPanelHeight: number | undefined
) => storage.set(getLocalStorageKey(localStorageKeyPrefix, HISTOGRAM_HEIGHT_KEY), topPanelHeight);

export const setBreakdownField = (
  storage: Storage,
  localStorageKeyPrefix: string,
  breakdownField: string | undefined
) =>
  storage.set(
    getLocalStorageKey(localStorageKeyPrefix, HISTOGRAM_BREAKDOWN_FIELD_KEY),
    breakdownField
  );
